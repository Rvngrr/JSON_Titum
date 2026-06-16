import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateMatch } from "@/lib/ai/match-engine";
import type {
  MatchCalculationRequest,
  MatchCalculationResponse,
  MatchResult,
  Skill,
  JobRequiredSkill,
} from "@/types";

/**
 * POST /api/match/calculate
 *
 * Triggers match calculation between applicant skill profiles and job descriptions.
 *
 * Modes:
 * - Both applicant_id + job_description_id: calculate for that specific pair
 * - Only job_description_id: batch calculate for all applicants against that job
 * - Only applicant_id: batch calculate for that applicant against all published jobs
 *
 * Authentication: Requires a valid Supabase session (authenticated user).
 * Uses admin client for all database reads/writes (bypasses RLS for internal operations).
 *
 * Requirements: 5.1, 5.2
 */
export async function POST(request: Request) {
  // 1. Validate caller is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, results: [], error: "Unauthorized" } satisfies MatchCalculationResponse,
      { status: 401 }
    );
  }

  // 2. Parse request body
  let body: MatchCalculationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, results: [], error: "Invalid request body" } satisfies MatchCalculationResponse,
      { status: 400 }
    );
  }

  const { applicant_id, job_description_id } = body;

  // At least one ID must be provided
  if (!applicant_id && !job_description_id) {
    return NextResponse.json(
      {
        success: false,
        results: [],
        error: "At least one of applicant_id or job_description_id is required",
      } satisfies MatchCalculationResponse,
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  try {
    // 3. Determine pairs to calculate
    const pairs = await resolvePairs(adminClient, applicant_id, job_description_id);

    if (pairs.length === 0) {
      return NextResponse.json(
        { success: true, results: [] } satisfies MatchCalculationResponse,
        { status: 200 }
      );
    }

    // 4. Calculate matches for each pair
    const results: MatchResult[] = [];

    for (const pair of pairs) {
      const matchResult = await calculateMatch(pair.applicantSkills, pair.jobRequiredSkills);

      // 5. Upsert result to match_results table
      const { data: upserted, error: upsertError } = await adminClient
        .from("match_results")
        .upsert(
          {
            applicant_id: pair.applicantId,
            job_description_id: pair.jobDescriptionId,
            match_percentage: matchResult.matchPercentage,
            matched_skills: matchResult.matchedSkills,
            missing_skills: matchResult.missingSkills,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: "applicant_id,job_description_id" }
        )
        .select()
        .single();

      if (upsertError) {
        console.error("Failed to upsert match result:", upsertError);
        continue;
      }

      if (upserted) {
        results.push(upserted as MatchResult);
      }
    }

    return NextResponse.json(
      { success: true, results } satisfies MatchCalculationResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("Match calculation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, results: [], error: message } satisfies MatchCalculationResponse,
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Types and Functions
// ============================================================================

interface MatchPair {
  applicantId: string;
  jobDescriptionId: string;
  applicantSkills: Skill[];
  jobRequiredSkills: JobRequiredSkill[];
}

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Resolves which applicant-job pairs need match calculation based on the request.
 *
 * - Both IDs: single pair
 * - Only job_description_id: all applicants with skill profiles vs that job
 * - Only applicant_id: that applicant vs all published jobs
 */
async function resolvePairs(
  adminClient: AdminClient,
  applicantId?: string,
  jobDescriptionId?: string
): Promise<MatchPair[]> {
  if (applicantId && jobDescriptionId) {
    // Single pair mode
    const [skills, jobSkills] = await Promise.all([
      fetchApplicantSkills(adminClient, applicantId),
      fetchJobRequiredSkills(adminClient, jobDescriptionId),
    ]);

    return [
      {
        applicantId,
        jobDescriptionId,
        applicantSkills: skills,
        jobRequiredSkills: jobSkills,
      },
    ];
  }

  if (jobDescriptionId) {
    // Batch: all applicants against this job
    const [applicants, jobSkills] = await Promise.all([
      fetchAllApplicantsWithSkills(adminClient),
      fetchJobRequiredSkills(adminClient, jobDescriptionId),
    ]);

    return applicants.map((applicant) => ({
      applicantId: applicant.userId,
      jobDescriptionId,
      applicantSkills: applicant.skills,
      jobRequiredSkills: jobSkills,
    }));
  }

  // Batch: this applicant against all published jobs
  const [skills, jobs] = await Promise.all([
    fetchApplicantSkills(adminClient, applicantId!),
    fetchAllPublishedJobsWithSkills(adminClient),
  ]);

  return jobs.map((job) => ({
    applicantId: applicantId!,
    jobDescriptionId: job.jobDescriptionId,
    applicantSkills: skills,
    jobRequiredSkills: job.requiredSkills,
  }));
}

/**
 * Fetches an applicant's skills by their user/profile ID.
 */
async function fetchApplicantSkills(
  adminClient: AdminClient,
  applicantId: string
): Promise<Skill[]> {
  // First get the skill profile for this applicant
  const { data: skillProfile } = await adminClient
    .from("skill_profiles")
    .select("id")
    .eq("user_id", applicantId)
    .maybeSingle();

  if (!skillProfile) {
    return [];
  }

  // Then get all skills for that profile
  const { data: skills } = await adminClient
    .from("skills")
    .select("*")
    .eq("skill_profile_id", skillProfile.id);

  return (skills as Skill[]) || [];
}

/**
 * Fetches required/preferred skills for a specific job description.
 */
async function fetchJobRequiredSkills(
  adminClient: AdminClient,
  jobDescriptionId: string
): Promise<JobRequiredSkill[]> {
  const { data: jobSkills } = await adminClient
    .from("job_required_skills")
    .select("*")
    .eq("job_description_id", jobDescriptionId);

  return (jobSkills as JobRequiredSkill[]) || [];
}

/**
 * Fetches all applicants who have skill profiles, along with their skills.
 */
async function fetchAllApplicantsWithSkills(
  adminClient: AdminClient
): Promise<Array<{ userId: string; skills: Skill[] }>> {
  // Get all applicant profiles (users with role 'applicant')
  const { data: applicantProfiles } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "applicant");

  if (!applicantProfiles || applicantProfiles.length === 0) {
    return [];
  }

  const results: Array<{ userId: string; skills: Skill[] }> = [];

  for (const profile of applicantProfiles) {
    const skills = await fetchApplicantSkills(adminClient, profile.id);
    // Only include applicants that have at least a skill profile
    results.push({ userId: profile.id, skills });
  }

  return results;
}

/**
 * Fetches all published job descriptions along with their required skills.
 */
async function fetchAllPublishedJobsWithSkills(
  adminClient: AdminClient
): Promise<Array<{ jobDescriptionId: string; requiredSkills: JobRequiredSkill[] }>> {
  const { data: jobs } = await adminClient
    .from("job_descriptions")
    .select("id")
    .eq("status", "published");

  if (!jobs || jobs.length === 0) {
    return [];
  }

  const results: Array<{ jobDescriptionId: string; requiredSkills: JobRequiredSkill[] }> = [];

  for (const job of jobs) {
    const requiredSkills = await fetchJobRequiredSkills(adminClient, job.id);
    results.push({ jobDescriptionId: job.id, requiredSkills });
  }

  return results;
}
