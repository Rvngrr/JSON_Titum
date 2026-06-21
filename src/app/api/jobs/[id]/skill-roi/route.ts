import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { analyzeSkillROI } from "@/lib/career-intelligence/skill-roi-analyzer";

/**
 * GET /api/jobs/:id/skill-roi
 *
 * Returns the top 5 Skill ROI recommendations for the authenticated applicant
 * against the specified job listing. Each recommendation shows how much the
 * applicant's match score would improve by learning that skill.
 *
 * Authentication: Requires a valid Supabase session with the `applicant` role.
 * - 401: Unauthenticated (no valid session)
 * - 403: Unauthorized (user is not an applicant)
 * - 404: Job not found or no required skills defined for the job
 *
 * URL Params:
 * - id: UUID of the job description
 *
 * Response (200):
 * {
 *   success: true,
 *   results: SkillROIResult[]  // top 5 sorted by scoreDelta descending
 * }
 *
 * Requirements: 14.4, 14.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  // 1. Authenticate the caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // 2. Verify the caller has the applicant role
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: "Unable to verify user role." },
      { status: 500 }
    );
  }

  if (profile.role !== "applicant") {
    return NextResponse.json(
      { success: false, error: "Forbidden. Only applicants can view skill ROI analysis." },
      { status: 403 }
    );
  }

  // 3. Fetch the job's required skills from job_required_skills table
  const { data: jobSkills, error: jobSkillsError } = await adminClient
    .from("job_required_skills")
    .select("skill_name, importance")
    .eq("job_description_id", jobId);

  if (jobSkillsError) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch job skills." },
      { status: 500 }
    );
  }

  if (!jobSkills || jobSkills.length === 0) {
    return NextResponse.json(
      { success: false, error: "Job not found or no required skills defined for this job." },
      { status: 404 }
    );
  }

  // 4. Fetch the applicant's skills via skill_profiles → skills
  const { data: skillProfile } = await adminClient
    .from("skill_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let applicantSkillNames: string[] = [];

  if (skillProfile) {
    const { data: applicantSkills } = await adminClient
      .from("skills")
      .select("name")
      .eq("skill_profile_id", skillProfile.id);

    if (applicantSkills) {
      applicantSkillNames = applicantSkills.map((s) => s.name);
    }
  }

  // 5. Determine missing skills by comparing applicant skills vs job required skills
  const applicantSkillsNormalized = applicantSkillNames.map((s) =>
    s.toLowerCase().trim()
  );

  const missingSkills = jobSkills
    .filter(
      (js) =>
        !applicantSkillsNormalized.some(
          (as) =>
            as === js.skill_name.toLowerCase().trim() ||
            as.includes(js.skill_name.toLowerCase().trim()) ||
            js.skill_name.toLowerCase().trim().includes(as)
        )
    )
    .map((js) => js.skill_name);

  // 6. Call the Skill ROI Analyzer with top 5
  const jobRequiredSkills = jobSkills.map((js) => ({
    skill_name: js.skill_name,
    importance: js.importance as "required" | "preferred",
  }));

  try {
    const results = await analyzeSkillROI(
      applicantSkillNames,
      jobRequiredSkills,
      missingSkills,
      5
    );

    return NextResponse.json(
      { success: true, results },
      { status: 200 }
    );
  } catch (error) {
    console.error("Skill ROI analysis error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
