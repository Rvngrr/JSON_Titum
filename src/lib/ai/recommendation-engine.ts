/**
 * Recommendation Engine - Generates AI-powered improvement suggestions for applicants.
 *
 * Analyzes the gap between an applicant's Skill_Profile and a Job_Description's
 * requirements, producing categorized and scored recommendations.
 *
 * The core logic (validation, sorting, categorization) is separated from the
 * OpenAI call to enable unit testing without mocking external services.
 */

import OpenAI from 'openai';
import type { Skill, JobRequiredSkill, MatchResult } from '@/types';
import {
  getRecommendationSystemPrompt,
  getRecommendationUserPrompt,
} from './prompts';

// ============================================================================
// Types
// ============================================================================

/**
 * A single recommendation produced by the engine.
 */
export interface RecommendationSuggestion {
  suggestion_type: 'skill_to_add' | 'skill_to_improve';
  skill_name: string;
  description: string;
  impact_score: number;
}

/**
 * Input parameters for the recommendation engine.
 */
export interface RecommendationInput {
  applicantSkills: Skill[];
  jobRequiredSkills: JobRequiredSkill[];
  matchResult: Pick<MatchResult, 'match_percentage' | 'matched_skills' | 'missing_skills'>;
}

// ============================================================================
// Core Logic (Testable without OpenAI)
// ============================================================================

/**
 * Validates and normalizes a raw recommendation object from AI output.
 * Returns null if the object is invalid.
 */
export function validateRecommendation(raw: unknown): RecommendationSuggestion | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;

  const suggestionType = obj.suggestion_type;
  if (suggestionType !== 'skill_to_add' && suggestionType !== 'skill_to_improve') {
    return null;
  }

  const skillName = obj.skill_name;
  if (typeof skillName !== 'string' || skillName.trim().length === 0) {
    return null;
  }

  const description = obj.description;
  if (typeof description !== 'string' || description.trim().length === 0) {
    return null;
  }

  const impactScore = Number(obj.impact_score);
  if (!Number.isInteger(impactScore) || impactScore < 1 || impactScore > 10) {
    return null;
  }

  return {
    suggestion_type: suggestionType,
    skill_name: skillName.trim(),
    description: description.trim(),
    impact_score: impactScore,
  };
}

/**
 * Sorts recommendations by impact_score in descending order.
 */
export function sortByImpactDescending(
  recommendations: RecommendationSuggestion[]
): RecommendationSuggestion[] {
  return [...recommendations].sort((a, b) => b.impact_score - a.impact_score);
}

/**
 * Generates a fallback recommendation when AI fails to produce suggestions
 * but the match is below 100%. Ensures at least one recommendation is returned.
 */
export function generateFallbackRecommendation(
  input: RecommendationInput
): RecommendationSuggestion {
  const { matchResult, jobRequiredSkills, applicantSkills } = input;

  // Find the first missing required skill
  const missingRequired = jobRequiredSkills.find(
    (jrs) =>
      jrs.importance === 'required' &&
      matchResult.missing_skills.includes(jrs.skill_name)
  );

  if (missingRequired) {
    return {
      suggestion_type: 'skill_to_add',
      skill_name: missingRequired.skill_name,
      description: `Add ${missingRequired.skill_name} to your profile as it is a required skill for this position.`,
      impact_score: 8,
    };
  }

  // Find any missing skill (preferred)
  const missingPreferred = jobRequiredSkills.find(
    (jrs) => matchResult.missing_skills.includes(jrs.skill_name)
  );

  if (missingPreferred) {
    return {
      suggestion_type: 'skill_to_add',
      skill_name: missingPreferred.skill_name,
      description: `Consider adding ${missingPreferred.skill_name} to strengthen your application.`,
      impact_score: 5,
    };
  }

  // If no missing skills but match < 100, suggest improving an existing skill
  const existingSkillToImprove = applicantSkills.find(
    (s) => s.proficiency_level !== 'expert'
  );

  if (existingSkillToImprove) {
    return {
      suggestion_type: 'skill_to_improve',
      skill_name: existingSkillToImprove.name,
      description: `Improve your ${existingSkillToImprove.name} proficiency from ${existingSkillToImprove.proficiency_level} to a higher level.`,
      impact_score: 4,
    };
  }

  // Last resort fallback
  return {
    suggestion_type: 'skill_to_improve',
    skill_name: 'General Skills',
    description: 'Continue developing your expertise to better align with this role.',
    impact_score: 3,
  };
}

/**
 * Parses the raw AI response string into validated recommendations.
 */
export function parseRecommendationsFromAI(
  responseText: string
): RecommendationSuggestion[] {
  try {
    // Strip potential markdown code fences
    const cleaned = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validated: RecommendationSuggestion[] = [];
    for (const item of parsed) {
      const recommendation = validateRecommendation(item);
      if (recommendation) {
        validated.push(recommendation);
      }
    }

    return validated;
  } catch {
    return [];
  }
}

// ============================================================================
// OpenAI Integration
// ============================================================================

/**
 * Calls OpenAI to generate recommendations based on the skill gap.
 * Separated from core logic to allow independent testing.
 */
async function callOpenAIForRecommendations(
  input: RecommendationInput
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: getRecommendationSystemPrompt(),
      },
      {
        role: 'user',
        content: getRecommendationUserPrompt(
          input.applicantSkills,
          input.jobRequiredSkills,
          input.matchResult
        ),
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content ?? '[]';
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates recommendations for an applicant to improve their match against a job.
 *
 * - Returns an empty array when match_percentage is 100 (caller handles "fully matched" message).
 * - Uses OpenAI to analyze the gap and produce actionable suggestions.
 * - Categorizes each as "skill_to_add" or "skill_to_improve".
 * - Scores each by impact (1-10) and sorts by impact_score descending.
 * - Guarantees at least one suggestion when match < 100.
 *
 * @param input - The applicant's skills, job requirements, and current match result
 * @returns Sorted array of recommendations, or empty array if fully matched
 */
export async function generateRecommendations(
  input: RecommendationInput
): Promise<RecommendationSuggestion[]> {
  // Edge case: 100% match returns empty array
  if (input.matchResult.match_percentage === 100) {
    return [];
  }

  let recommendations: RecommendationSuggestion[];

  try {
    const aiResponse = await callOpenAIForRecommendations(input);
    recommendations = parseRecommendationsFromAI(aiResponse);
  } catch {
    // If OpenAI call fails, fall back to deterministic recommendations
    recommendations = [];
  }

  // Ensure at least one suggestion when match < 100
  if (recommendations.length === 0) {
    recommendations = [generateFallbackRecommendation(input)];
  }

  // Sort by impact score descending
  return sortByImpactDescending(recommendations);
}
