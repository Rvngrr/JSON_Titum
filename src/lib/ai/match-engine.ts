/**
 * Match Engine - Calculates match percentages between applicant skill profiles
 * and job descriptions using AI-powered semantic skill matching.
 *
 * Architecture:
 * - `calculateMatch()` is the main entry point that orchestrates the full flow
 * - `performSemanticMatching()` calls OpenAI for fuzzy/semantic skill name matching
 * - `calculateWeightedScore()` is a pure function for testability (no AI dependency)
 */

import type { Skill, JobRequiredSkill } from "@/types";
import {
  SKILL_MATCHING_SYSTEM_PROMPT,
  buildSkillMatchingUserPrompt,
  type SkillMatchingResponse,
} from "./prompts";
import { callGemini } from "./gemini";
import { performLocalMatching } from "./local-matcher";

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
 * Proficiency levels provide bonus scoring for matched skills.
 * Returns a normalized integer score from 0-100.
 *
 * This function is pure and deterministic - no AI calls needed.
 *
 * @param matchDetails - Array of skill match details with importance levels
 * @param applicantSkills - Optional array of applicant skills with proficiency info for bonus scoring
 * @returns Object with matchPercentage (0-100), matchedSkills, and missingSkills
 */
export function calculateWeightedScore(
  matchDetails: SkillMatchDetail[],
  applicantSkills?: Skill[]
): MatchEngineResult {
  if (matchDetails.length === 0) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  // Build a proficiency lookup if applicant skills are provided
  const proficiencyMap = new Map<string, string>();
  if (applicantSkills) {
    for (const skill of applicantSkills) {
      proficiencyMap.set(skill.name.toLowerCase(), skill.proficiency_level);
    }
  }

  // Proficiency multiplier: higher proficiency gives a bonus to the weight earned
  const proficiencyMultiplier: Record<string, number> = {
    beginner: 0.6,
    intermediate: 0.8,
    advanced: 1.0,
    expert: 1.0,
  };

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const detail of matchDetails) {
    const weight = detail.importance === "required" ? 2 : 1;
    totalWeight += weight;

    if (detail.isMatch) {
      // Apply proficiency multiplier if we have proficiency data
      let effectiveWeight = weight;
      if (detail.applicantSkill && proficiencyMap.size > 0) {
        const proficiency = proficiencyMap.get(detail.applicantSkill.toLowerCase());
        const multiplier = proficiency ? (proficiencyMultiplier[proficiency] ?? 1.0) : 1.0;
        effectiveWeight = weight * multiplier;
      }
      matchedWeight += effectiveWeight;
      matchedSkills.push(detail.jobSkill);
    } else {
      missingSkills.push(detail.jobSkill);
    }
  }

  // Avoid division by zero
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
// Skill Matching (Local by default, AI as optional fallback)
// ============================================================================

/**
 * Performs skill matching between applicant skills and job required skills.
 * Uses local synonym-based matching (zero API calls) for efficiency.
 * Falls back to Gemini AI only if USE_AI_MATCHING=true is set in env.
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

  // Use local matching (no API calls, instant, free)
  const localResults = performLocalMatching(applicantSkills, jobSkills);
  return localResults;
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

  // Calculate weighted score using the pure scoring function (with proficiency data)
  return calculateWeightedScore(matchDetails, applicantSkills);
}
