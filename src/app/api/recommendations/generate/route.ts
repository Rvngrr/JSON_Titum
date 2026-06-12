import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateRecommendations } from "@/lib/ai/recommendation-engine";
import type {
  RecommendationGenerateRequest,
  RecommendationGenerateResponse,
  Skill,
  JobRequiredSkill,
} from "@/types";

/**
 * POST /api/recommendations/generate
 *
 * Generates AI-powered improvement recommendations for an applicant-job pair.
 *
 * 1. Validates request body (applicant_id, job_description_id required)
 * 2. Authenticates caller and verifies they are the applicant (or service call)
 * 3. Fetches applicant skills, job required skills, and match result
 * 4. Calls Recommendation_Engine to generate suggestions
 * 5. Persists recommendations to the database (replacing any old ones)
 * 6. Returns persisted recommendations
 *
 * Requirements: 7.1, 7.4
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body: RecommendationGenerateRequest = await request.json();
    const { applicant_id, job_description_id } = body;

    if (!applicant_id || !job_description_id) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Both applicant_id and job_description_id are required",
        } satisfies RecommendationGenerateResponse,
        { status: 400 }
      );
    }

    // 2. Authenticate the caller and verify authorization
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Authentication required",
        } satisfies RecommendationGenerateResponse,
        { status: 401 }
      );
    }

    // Verify the caller is the applicant themselves
    // Internal/service calls would use the admin client directly and not hit this route,
    // but we also allow if the user's role is hr_user (internal trigger scenario)
    if (user.id !== applicant_id) {
      // Check if this is an internal call by checking the user's role
      const adminClient = createAdminClient();
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // Only the applicant themselves can generate their own recommendations
      // unless it's an internal service call (no user context would be present)
      if (!callerProfile || callerProfile.role !== "hr_user") {
        return NextResponse.json(
          {
            success: false,
            recommendations: [],
            error: "Unauthorized: You can only generate recommendations for yourself",
          } satisfies RecommendationGenerateResponse,
          { status: 403 }
        );
      }
    }

    const adminClient = createAdminClient();

    // 3. Fetch the applicant's skills via their skill_profile
    const { data: skillProfile, error: profileError } = await adminClient
      .from("skill_profiles")
      .select("id")
      .eq("user_id", applicant_id)
      .single();

    if (profileError || !skillProfile) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Applicant skill profile not found",
        } satisfies RecommendationGenerateResponse,
        { status: 404 }
      );
    }

    const { data: skills, error: skillsError } = await adminClient
      .from("skills")
      .select("*")
      .eq("skill_profile_id", skillProfile.id);

    if (skillsError) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Failed to fetch applicant skills",
        } satisfies RecommendationGenerateResponse,
        { status: 500 }
      );
    }

    const applicantSkills: Skill[] = skills ?? [];

    // 4. Fetch the job's required skills
    const { data: jobRequiredSkills, error: jobSkillsError } = await adminClient
      .from("job_required_skills")
      .select("*")
      .eq("job_description_id", job_description_id);

    if (jobSkillsError) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Failed to fetch job required skills",
        } satisfies RecommendationGenerateResponse,
        { status: 500 }
      );
    }

    if (!jobRequiredSkills || jobRequiredSkills.length === 0) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Job description not found or has no required skills",
        } satisfies RecommendationGenerateResponse,
        { status: 404 }
      );
    }

    const typedJobSkills: JobRequiredSkill[] = jobRequiredSkills;

    // 5. Fetch or get the current match result for this pair
    const { data: matchResult, error: matchError } = await adminClient
      .from("match_results")
      .select("match_percentage, matched_skills, missing_skills")
      .eq("applicant_id", applicant_id)
      .eq("job_description_id", job_description_id)
      .single();

    if (matchError || !matchResult) {
      // If no match result exists yet, use a default (0% match with all skills missing)
      const fallbackMatchResult = {
        match_percentage: 0,
        matched_skills: [] as string[],
        missing_skills: typedJobSkills.map((s) => s.skill_name),
      };

      // 6. Call Recommendation_Engine with fallback match result
      const suggestions = await generateRecommendations({
        applicantSkills,
        jobRequiredSkills: typedJobSkills,
        matchResult: fallbackMatchResult,
      });

      // 7. Delete old recommendations and insert new ones
      await adminClient
        .from("recommendations")
        .delete()
        .eq("applicant_id", applicant_id)
        .eq("job_description_id", job_description_id);

      const recommendationRows = suggestions.map((suggestion) => ({
        applicant_id,
        job_description_id,
        suggestion_type: suggestion.suggestion_type,
        skill_name: suggestion.skill_name,
        description: suggestion.description,
        impact_score: suggestion.impact_score,
      }));

      const { data: inserted, error: insertError } = await adminClient
        .from("recommendations")
        .insert(recommendationRows)
        .select("*");

      if (insertError) {
        return NextResponse.json(
          {
            success: false,
            recommendations: [],
            error: "Failed to persist recommendations",
          } satisfies RecommendationGenerateResponse,
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        recommendations: inserted ?? [],
      } satisfies RecommendationGenerateResponse);
    }

    // 6. Call Recommendation_Engine with actual match result
    const suggestions = await generateRecommendations({
      applicantSkills,
      jobRequiredSkills: typedJobSkills,
      matchResult: {
        match_percentage: matchResult.match_percentage,
        matched_skills: matchResult.matched_skills ?? [],
        missing_skills: matchResult.missing_skills ?? [],
      },
    });

    // 7. Delete old recommendations for this pair, then insert new ones
    await adminClient
      .from("recommendations")
      .delete()
      .eq("applicant_id", applicant_id)
      .eq("job_description_id", job_description_id);

    const recommendationRows = suggestions.map((suggestion) => ({
      applicant_id,
      job_description_id,
      suggestion_type: suggestion.suggestion_type,
      skill_name: suggestion.skill_name,
      description: suggestion.description,
      impact_score: suggestion.impact_score,
    }));

    // If there are no recommendations (100% match), return empty array
    if (recommendationRows.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
      } satisfies RecommendationGenerateResponse);
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("recommendations")
      .insert(recommendationRows)
      .select("*");

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          recommendations: [],
          error: "Failed to persist recommendations",
        } satisfies RecommendationGenerateResponse,
        { status: 500 }
      );
    }

    // 8. Return the persisted recommendations
    return NextResponse.json({
      success: true,
      recommendations: inserted ?? [],
    } satisfies RecommendationGenerateResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        recommendations: [],
        error: message,
      } satisfies RecommendationGenerateResponse,
      { status: 500 }
    );
  }
}
