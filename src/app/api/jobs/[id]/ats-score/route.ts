import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateATSScore } from "@/lib/career-intelligence/ats-scorer";
import type { ATSScoreResult } from "@/lib/career-intelligence/types";

/**
 * GET /api/jobs/:id/ats-score
 *
 * Calculates ATS compatibility score for the authenticated applicant's resume
 * against the specified job listing.
 *
 * On first view per applicant-job pair, triggers the 2-step LLM pipeline:
 * 1. Keyword extraction from job description (cached per job)
 * 2. Intelligent matching + suggestions (cached per applicant-job pair)
 *
 * Subsequent views are served from cache.
 *
 * Authentication: Requires a valid Supabase session (applicant).
 * - 401: Unauthenticated (no valid session)
 * - 404: Job not found or applicant has no resume
 * - 500: Internal server error
 *
 * Response includes:
 * - score: 0-100 ATS compatibility score
 * - totalKeywords: number of keywords extracted from job
 * - matchedKeywords: array with keyword, matchedText, and matchType (exact/synonym/contextual)
 * - missingKeywords: array of keywords not found in resume
 * - suggestions: actionable improvements with section, suggestion text, and impact level
 * - analysisSource: 'llm' or 'local' (indicates whether LLM or fallback was used)
 * - warning: present when analysisSource is 'local' to indicate reduced accuracy
 *
 * Requirements: 12.1, 12.5, 12.6
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

  // 2. Use admin client for DB queries (bypasses RLS)
  const adminClient = createAdminClient();

  // 3. Fetch the job description
  const { data: job, error: jobError } = await adminClient
    .from("job_descriptions")
    .select("id, description, qualifications")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { success: false, error: "Job not found." },
      { status: 404 }
    );
  }

  // 4. Fetch the applicant's resume text from skill_profiles
  const { data: skillProfile, error: profileError } = await adminClient
    .from("skill_profiles")
    .select("raw_resume_text")
    .eq("user_id", user.id)
    .single();

  if (profileError || !skillProfile || !skillProfile.raw_resume_text) {
    return NextResponse.json(
      {
        success: false,
        error: "No resume found. Please upload your resume first.",
      },
      { status: 404 }
    );
  }

  // 5. Fetch job required skills to use as fallback keywords (in case LLM is unavailable)
  const { data: jobRequiredSkills } = await adminClient
    .from("job_required_skills")
    .select("skill_name")
    .eq("job_description_id", jobId);

  const fallbackKeywords = jobRequiredSkills
    ? jobRequiredSkills.map((s: { skill_name: string }) => s.skill_name)
    : undefined;

  // 6. Calculate ATS score using the 2-step LLM pipeline (with cache)
  let result: ATSScoreResult;

  try {
    result = await calculateATSScore(
      skillProfile.raw_resume_text,
      job.description,
      job.qualifications ?? null,
      job.id,
      jobId,
      fallbackKeywords
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: `Failed to calculate ATS score: ${message}` },
      { status: 500 }
    );
  }

  // 6. Build response
  const response: Record<string, unknown> = {
    success: true,
    score: result.score,
    totalKeywords: result.totalKeywords,
    matchedKeywords: result.matchedKeywords,
    missingKeywords: result.missingKeywords,
    suggestions: result.suggestions,
    analysisSource: result.analysisSource,
  };

  // Include warning when local fallback was used (reduced accuracy)
  if (result.analysisSource === "local") {
    response.warning =
      "ATS analysis was performed using basic keyword matching. LLM-powered intelligent matching was unavailable. Results may be less accurate.";
  }

  return NextResponse.json(response, { status: 200 });
}
