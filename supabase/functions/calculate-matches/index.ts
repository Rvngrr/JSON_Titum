/**
 * Supabase Edge Function: calculate-matches
 *
 * Triggered by database webhooks when:
 * - A job_description is inserted/updated (from `notify_job_updated` trigger)
 * - A skill_profile is updated or skills change (from `notify_profile_updated` trigger)
 *
 * On job change: recalculates matches for all applicants against that job.
 * On profile change: recalculates matches for that applicant against all published jobs.
 *
 * Uses a simplified string-matching approach (basic normalization + fuzzy matching)
 * to ensure batch operations complete within 30 seconds without relying on OpenAI.
 *
 * Requirements: 3.5, 4.3, 5.1
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// Types
// ============================================================================

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
  schema: string;
}

interface JobRequiredSkillRow {
  id: string;
  job_description_id: string;
  skill_name: string;
  importance: "required" | "preferred";
}

interface MatchUpsert {
  applicant_id: string;
  job_description_id: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  calculated_at: string;
}

// ============================================================================
// Skill Matching Logic (simplified, no OpenAI dependency)
// ============================================================================

/**
 * Normalizes a skill name for comparison.
 * Lowercases, trims whitespace, removes special characters,
 * and handles common variations (e.g., "react.js" -> "reactjs").
 */
function normalizeSkillName(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[.\-_\/\\]/g, "")  // Remove dots, hyphens, underscores, slashes
    .replace(/\s+/g, "")          // Remove spaces
    .replace(/js$/i, "javascript") // Normalize "js" suffix
    .replace(/^js/i, "javascript"); // Normalize "js" prefix
}

/**
 * Checks whether two skill names are a semantic match using basic normalization.
 * Supports exact matches after normalization and substring containment.
 */
function skillsMatch(applicantSkill: string, jobSkill: string): boolean {
  const normalizedApplicant = normalizeSkillName(applicantSkill);
  const normalizedJob = normalizeSkillName(jobSkill);

  // Exact match after normalization
  if (normalizedApplicant === normalizedJob) {
    return true;
  }

  // One contains the other (handles "React" matching "React.js", "Node" matching "Node.js")
  if (
    normalizedApplicant.includes(normalizedJob) ||
    normalizedJob.includes(normalizedApplicant)
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates match percentage between an applicant's skills and a job's requirements.
 * Required skills have 2x weight, preferred skills have 1x weight.
 * Returns a normalized score from 0-100.
 */
function calculateMatchScore(
  applicantSkills: string[],
  jobSkills: JobRequiredSkillRow[]
): { matchPercentage: number; matchedSkills: string[]; missingSkills: string[] } {
  if (jobSkills.length === 0) {
    return { matchPercentage: 0, matchedSkills: [], missingSkills: [] };
  }

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of jobSkills) {
    const weight = jobSkill.importance === "required" ? 2 : 1;
    totalWeight += weight;

    const hasMatch = applicantSkills.some((applicantSkill) =>
      skillsMatch(applicantSkill, jobSkill.skill_name)
    );

    if (hasMatch) {
      matchedWeight += weight;
      matchedSkills.push(jobSkill.skill_name);
    } else {
      missingSkills.push(jobSkill.skill_name);
    }
  }

  if (totalWeight === 0) {
    return { matchPercentage: 0, matchedSkills: [], missingSkills: [] };
  }

  const rawPercentage = (matchedWeight / totalWeight) * 100;
  const matchPercentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  return { matchPercentage, matchedSkills, missingSkills };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Recalculates matches for all applicants against a specific job.
 * Called when a job description is created or updated.
 */
async function recalculateForJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string
): Promise<{ count: number }> {
  // Verify the job is published
  const { data: job, error: jobError } = await supabase
    .from("job_descriptions")
    .select("id, status")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("Failed to fetch job:", jobError?.message);
    return { count: 0 };
  }

  // Only calculate matches for published jobs
  if (job.status !== "published") {
    console.log(`Job ${jobId} is not published (status: ${job.status}), skipping.`);
    return { count: 0 };
  }

  // Fetch required skills for this job
  const { data: jobSkills, error: skillsError } = await supabase
    .from("job_required_skills")
    .select("id, job_description_id, skill_name, importance")
    .eq("job_description_id", jobId);

  if (skillsError || !jobSkills) {
    console.error("Failed to fetch job skills:", skillsError?.message);
    return { count: 0 };
  }

  // Fetch all applicant skill profiles with their skills
  const { data: skillProfiles, error: profilesError } = await supabase
    .from("skill_profiles")
    .select("id, user_id");

  if (profilesError || !skillProfiles) {
    console.error("Failed to fetch skill profiles:", profilesError?.message);
    return { count: 0 };
  }

  const upserts: MatchUpsert[] = [];
  const now = new Date().toISOString();

  for (const profile of skillProfiles) {
    // Fetch skills for this profile
    const { data: skills, error: skillError } = await supabase
      .from("skills")
      .select("name")
      .eq("skill_profile_id", profile.id);

    if (skillError || !skills) {
      console.error(`Failed to fetch skills for profile ${profile.id}:`, skillError?.message);
      continue;
    }

    const applicantSkillNames = skills.map((s: { name: string }) => s.name);
    const result = calculateMatchScore(applicantSkillNames, jobSkills as JobRequiredSkillRow[]);

    upserts.push({
      applicant_id: profile.user_id,
      job_description_id: jobId,
      match_percentage: result.matchPercentage,
      matched_skills: result.matchedSkills,
      missing_skills: result.missingSkills,
      calculated_at: now,
    });
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("match_results")
      .upsert(upserts, {
        onConflict: "applicant_id,job_description_id",
      });

    if (upsertError) {
      console.error("Failed to upsert match results:", upsertError.message);
      return { count: 0 };
    }
  }

  return { count: upserts.length };
}

/**
 * Recalculates matches for a specific applicant against all published jobs.
 * Called when an applicant's skill profile is updated.
 */
async function recalculateForProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ count: number }> {
  // Fetch the applicant's skill profile
  const { data: profile, error: profileError } = await supabase
    .from("skill_profiles")
    .select("id, user_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Failed to fetch skill profile:", profileError?.message);
    return { count: 0 };
  }

  // Fetch the applicant's skills
  const { data: skills, error: skillsError } = await supabase
    .from("skills")
    .select("name")
    .eq("skill_profile_id", profile.id);

  if (skillsError || !skills) {
    console.error("Failed to fetch applicant skills:", skillsError?.message);
    return { count: 0 };
  }

  const applicantSkillNames = skills.map((s: { name: string }) => s.name);

  // Fetch all published job descriptions
  const { data: jobs, error: jobsError } = await supabase
    .from("job_descriptions")
    .select("id")
    .eq("status", "published");

  if (jobsError || !jobs) {
    console.error("Failed to fetch published jobs:", jobsError?.message);
    return { count: 0 };
  }

  const upserts: MatchUpsert[] = [];
  const now = new Date().toISOString();

  for (const job of jobs) {
    // Fetch required skills for this job
    const { data: jobSkills, error: jobSkillsError } = await supabase
      .from("job_required_skills")
      .select("id, job_description_id, skill_name, importance")
      .eq("job_description_id", job.id);

    if (jobSkillsError || !jobSkills) {
      console.error(`Failed to fetch skills for job ${job.id}:`, jobSkillsError?.message);
      continue;
    }

    const result = calculateMatchScore(applicantSkillNames, jobSkills as JobRequiredSkillRow[]);

    upserts.push({
      applicant_id: userId,
      job_description_id: job.id,
      match_percentage: result.matchPercentage,
      matched_skills: result.matchedSkills,
      missing_skills: result.missingSkills,
      calculated_at: now,
    });
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase
      .from("match_results")
      .upsert(upserts, {
        onConflict: "applicant_id,job_description_id",
      });

    if (upsertError) {
      console.error("Failed to upsert match results:", upsertError.message);
      return { count: 0 };
    }
  }

  return { count: upserts.length };
}

// ============================================================================
// Edge Function Handler
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests (webhook payloads)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  try {
    const payload: WebhookPayload = await req.json();

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let result: { count: number } = { count: 0 };

    // Determine what changed based on the table in the webhook payload
    if (payload.table === "job_descriptions") {
      // Job was created or updated — recalculate for all applicants
      const jobId = payload.record?.id as string;
      if (!jobId) {
        throw new Error("Missing job_id in webhook payload record");
      }
      console.log(`Job updated: ${jobId}. Recalculating matches for all applicants.`);
      result = await recalculateForJob(supabase, jobId);
    } else if (payload.table === "skill_profiles") {
      // Profile was updated — recalculate for that applicant
      const userId = payload.record?.user_id as string;
      if (!userId) {
        throw new Error("Missing user_id in webhook payload record");
      }
      console.log(`Profile updated for user: ${userId}. Recalculating matches for all jobs.`);
      result = await recalculateForProfile(supabase, userId);
    } else if (payload.table === "skills") {
      // A skill was added or removed — resolve the user and recalculate
      const skillProfileId = (payload.record?.skill_profile_id ??
        payload.old_record?.skill_profile_id) as string;
      if (!skillProfileId) {
        throw new Error("Missing skill_profile_id in webhook payload");
      }

      // Resolve user_id from skill_profile_id
      const { data: profile, error } = await supabase
        .from("skill_profiles")
        .select("user_id")
        .eq("id", skillProfileId)
        .single();

      if (error || !profile) {
        throw new Error(`Failed to resolve user_id from skill_profile_id: ${error?.message}`);
      }

      console.log(`Skill changed for user: ${profile.user_id}. Recalculating matches for all jobs.`);
      result = await recalculateForProfile(supabase, profile.user_id);
    } else {
      console.log(`Unrecognized table in webhook: ${payload.table}. No action taken.`);
      return new Response(
        JSON.stringify({ message: "No action taken", table: payload.table }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`Match recalculation complete. ${result.count} matches upserted in ${elapsed}ms.`);

    return new Response(
      JSON.stringify({
        success: true,
        matches_calculated: result.count,
        elapsed_ms: elapsed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Edge Function error after ${elapsed}ms:`, message);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        elapsed_ms: elapsed,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
