/**
 * Match Engine - Calculates match percentages between applicant skill profiles
 * and job descriptions using AI-powered semantic skill matching.
 *
 * Architecture:
 * - `calculateMatch()` is the main entry point that orchestrates the full flow
 * - `performSemanticMatching()` calls OpenAI for fuzzy/semantic skill name matching
 * - `calculateWeightedScore()` is a pure function for testability (no AI dependency)
 */

import OpenAI from "openai";
import type { Skill, JobRequiredSkill } from "@/types";
import {
  SKILL_MATCHING_SYSTEM_PROMPT,
  buildSkillMatchingUserPrompt,
  type SkillMatchingResponse,
} from "./prompts";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a match calculation between an applicant and a job.
 */
export interface MatchEngineResult {
  /** Normalized match score, integer between 0 and 100 inclusive */
  matchPercentage: number;
  /** Skills from the applicant that matched job requirements */
  matchedSkills: string[];
  /** Skills required/preferred by the job that the applicant is missing */
  missingSkills: string[];
}

/**
 * A single skill match result from semantic matching.
 */
export interface SkillMatchDetail {
  /** The job skill name */
  jobSkill: string;
  /** The matching applicant skill name, or null if no match */
  applicantSkill: string | null;
  /** Whether a semantic match was found */
  isMatch: boolean;
  /** The importance/weight of this job skill */
  importance: "required" | "preferred";
}

// ============================================================================
// Pure Scoring Function (testable without OpenAI)
// ============================================================================

/**
 * Calculates a weighted match score from skill match details.
 * Required skills have 2x weight, preferred skills have 1x weight.
 * Returns a normalized integer score from 0-100.
 *
 * This function is pure and deterministic - no AI calls needed.
 *
 * @param matchDetails - Array of skill match details with importance levels
 * @returns Object with matchPercentage (0-100), matchedSkills, and missingSkills
 */
export function calculateWeightedScore(
  matchDetails: SkillMatchDetail[]
): MatchEngineResult {
  if (matchDetails.length === 0) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const detail of matchDetails) {
    const weight = detail.importance === "required" ? 2 : 1;
    totalWeight += weight;

    if (detail.isMatch) {
      matchedWeight += weight;
      matchedSkills.push(detail.jobSkill);
    } else {
      missingSkills.push(detail.jobSkill);
    }
  }

  // Avoid division by zero (shouldn't happen if matchDetails.length > 0,
  // but guard defensively)
  if (totalWeight === 0) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // Calculate percentage and clamp to 0-100 integer
  const rawPercentage = (matchedWeight / totalWeight) * 100;
  const matchPercentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
  };
}

// ============================================================================
// OpenAI Semantic Matching
// ============================================================================

/**
 * Creates an OpenAI client instance using the OPENAI_API_KEY environment variable.
 */
function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Cannot perform semantic skill matching."
    );
  }
  return new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1" });
}

/**
 * Uses OpenAI to perform semantic/fuzzy skill matching between applicant skills
 * and job required skills.
 *
 * For example, "React" will match "React.js", "JS" will match "JavaScript", etc.
 *
 * @param applicantSkills - Array of skill names from the applicant's profile
 * @param jobSkills - Array of job required skill objects with importance levels
 * @returns Array of match details for each job skill
 */
export async function performSemanticMatching(
  applicantSkills: string[],
  jobSkills: JobRequiredSkill[]
): Promise<SkillMatchDetail[]> {
  // If there are no job skills to match against, return empty
  if (jobSkills.length === 0) {
    return [];
  }

  // If there are no applicant skills, all job skills are missing
  if (applicantSkills.length === 0) {
    return jobSkills.map((js) => ({
      jobSkill: js.skill_name,
      applicantSkill: null,
      isMatch: false,
      importance: js.importance,
    }));
  }

  const openai = createOpenAIClient();
  const jobSkillNames = jobSkills.map((js) => js.skill_name);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SKILL_MATCHING_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSkillMatchingUserPrompt(applicantSkills, jobSkillNames),
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response for skill matching.");
  }

  let parsed: SkillMatchingResponse;
  try {
    parsed = JSON.parse(content) as SkillMatchingResponse;
  } catch {
    throw new Error(
      `Failed to parse OpenAI skill matching response as JSON: ${content}`
    );
  }

  if (!parsed.matches || !Array.isArray(parsed.matches)) {
    throw new Error(
      `OpenAI skill matching response missing 'matches' array: ${content}`
    );
  }

  // Build a lookup from job skill name to importance for enrichment
  const importanceMap = new Map<string, "required" | "preferred">();
  for (const js of jobSkills) {
    importanceMap.set(js.skill_name.toLowerCase(), js.importance);
  }

  // Map the AI response back to SkillMatchDetail with importance levels
  const matchDetails: SkillMatchDetail[] = parsed.matches.map((match) => {
    const importance =
      importanceMap.get(match.jobSkill.toLowerCase()) ?? "preferred";
    return {
      jobSkill: match.jobSkill,
      applicantSkill: match.applicantSkill,
      isMatch: match.isMatch,
      importance,
    };
  });

  return matchDetails;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Calculates the match between an applicant's skills and a job's requirements.
 *
 * Flow:
 * 1. Extract skill names from the applicant's Skill array
 * 2. Use OpenAI for semantic/fuzzy matching against job required skills
 * 3. Apply weighted scoring (required=2x, preferred=1x)
 * 4. Return normalized 0-100 match percentage with matched/missing skill lists
 *
 * @param applicantSkills - The applicant's skills from their profile
 * @param jobRequiredSkills - The job's required and preferred skills
 * @returns MatchEngineResult with matchPercentage, matchedSkills, missingSkills
 */
export async function calculateMatch(
  applicantSkills: Skill[],
  jobRequiredSkills: JobRequiredSkill[]
): Promise<MatchEngineResult> {
  // Extract skill names from the applicant's skill objects
  const applicantSkillNames = applicantSkills.map((s) => s.name);

  // Perform semantic matching via OpenAI
  const matchDetails = await performSemanticMatching(
    applicantSkillNames,
    jobRequiredSkills
  );

  // Calculate weighted score using the pure scoring function
  return calculateWeightedScore(matchDetails);
}
