/**
 * Recommendation Engine - Generates AI-powered improvement suggestions for applicants.
 *
 * Analyzes the gap between an applicant's Skill_Profile and a Job_Description's
 * requirements, producing categorized and scored recommendations.
 *
 * The core logic (validation, sorting, categorization) is separated from the
 * OpenAI call to enable unit testing without mocking external services.
 */

import type { Skill, JobRequiredSkill, MatchResult } from '@/types';
import {
  getRecommendationSystemPrompt,
  getRecommendationUserPrompt,
} from './prompts';
import { callGemini } from './gemini';

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
 * Generates multiple fallback recommendations when AI fails to produce suggestions
 * but the match is below 100%. Ensures meaningful guidance is still provided.
 */
export function generateFallbackRecommendations(
  input: RecommendationInput
): RecommendationSuggestion[] {
  const { matchResult, jobRequiredSkills, applicantSkills } = input;
  const suggestions: RecommendationSuggestion[] = [];

  // Add suggestions for all missing required skills
  const missingRequired = jobRequiredSkills.filter(
    (jrs) =>
      jrs.importance === 'required' &&
      matchResult.missing_skills.some(
        (ms) => ms.toLowerCase() === jrs.skill_name.toLowerCase()
      )
  );

  for (const skill of missingRequired) {
    suggestions.push({
      suggestion_type: 'skill_to_add',
      skill_name: skill.skill_name,
      description: `Add ${skill.skill_name} to your profile as it is a required skill for this position.`,
      impact_score: Math.min(10, Math.max(6, 10 - suggestions.length)),
    });
  }

  // Add suggestions for missing preferred skills
  const missingPreferred = jobRequiredSkills.filter(
    (jrs) =>
      jrs.importance === 'preferred' &&
      matchResult.missing_skills.some(
        (ms) => ms.toLowerCase() === jrs.skill_name.toLowerCase()
      )
  );

  for (const skill of missingPreferred) {
    suggestions.push({
      suggestion_type: 'skill_to_add',
      skill_name: skill.skill_name,
      description: `Consider adding ${skill.skill_name} to strengthen your application for this role.`,
      impact_score: Math.min(5, Math.max(3, 6 - suggestions.length)),
    });
  }

  // Add improvement suggestions for matched skills with low proficiency
  const improvableSkills = applicantSkills.filter(
    (s) =>
      s.proficiency_level !== 'expert' &&
      matchResult.matched_skills.some(
        (ms) => ms.toLowerCase() === s.name.toLowerCase()
      )
  );

  for (const skill of improvableSkills.slice(0, 3)) {
    suggestions.push({
      suggestion_type: 'skill_to_improve',
      skill_name: skill.name,
      description: `Improve your ${skill.name} proficiency from ${skill.proficiency_level} to a higher level to increase your competitiveness.`,
      impact_score: skill.proficiency_level === 'beginner' ? 5 : 3,
    });
  }

  // Ensure at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      suggestion_type: 'skill_to_improve',
      skill_name: 'General Skills',
      description: 'Continue developing your expertise to better align with this role.',
      impact_score: 3,
    });
  }

  return suggestions;
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
// Gemini Integration
// ============================================================================

/**
 * Calls Gemini to generate recommendations based on the skill gap.
 * Separated from core logic to allow independent testing.
 */
async function callAIForRecommendations(
  input: RecommendationInput
): Promise<string> {
  return callGemini(
    getRecommendationSystemPrompt(),
    getRecommendationUserPrompt(
      input.applicantSkills,
      input.jobRequiredSkills,
      input.matchResult
    ),
    { temperature: 0.7, maxTokens: 1500 }
  );
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
    const aiResponse = await callAIForRecommendations(input);
    recommendations = parseRecommendationsFromAI(aiResponse);
  } catch {
    // If Gemini call fails (quota, network, etc.), fall back to deterministic recommendations
    recommendations = [];
  }

  // Filter out recommendations for skills the applicant already has
  const matchedSkillsLower = new Set(
    input.matchResult.matched_skills.map(s => s.toLowerCase())
  );
  const applicantSkillsLower = new Set(
    input.applicantSkills.map(s => s.name.toLowerCase())
  );

  recommendations = recommendations.filter((rec) => {
    const skillLower = rec.skill_name.toLowerCase();
    // Don't recommend adding a skill the applicant already has
    if (rec.suggestion_type === 'skill_to_add') {
      return !matchedSkillsLower.has(skillLower) && !applicantSkillsLower.has(skillLower);
    }
    return true;
  });

  // Ensure at least one suggestion when match < 100
  if (recommendations.length === 0) {
    recommendations = generateFallbackRecommendations(input);
  }

  // Sort by impact score descending
  return sortByImpactDescending(recommendations);
}
