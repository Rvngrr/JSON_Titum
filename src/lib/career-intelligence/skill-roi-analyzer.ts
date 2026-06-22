/**
 * Skill ROI Analyzer
 *
 * Simulates adding each missing skill to an applicant's profile one at a time,
 * recalculates the match score, and ranks skills by the improvement they would provide.
 * This helps applicants prioritize which skills to learn first for maximum career impact.
 *
 * Pure local algorithm — no LLM dependency.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import type { SkillROIResult } from './types';

/**
 * Normalizes a skill name for comparison.
 * Mirrors the logic in supabase/functions/calculate-matches/index.ts.
 */
function normalizeSkillName(skill: string): string {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[.\-_\/\\]/g, '')   // Remove dots, hyphens, underscores, slashes
    .replace(/\s+/g, '')           // Remove spaces
    .replace(/js$/i, 'javascript') // Normalize "js" suffix
    .replace(/^js/i, 'javascript'); // Normalize "js" prefix
}

/**
 * Checks whether two skill names are a semantic match using basic normalization.
 */
function skillsMatch(applicantSkill: string, jobSkill: string): boolean {
  const normalizedApplicant = normalizeSkillName(applicantSkill);
  const normalizedJob = normalizeSkillName(jobSkill);

  if (normalizedApplicant === normalizedJob) {
    return true;
  }

  if (
    normalizedApplicant.includes(normalizedJob) ||
    normalizedJob.includes(normalizedApplicant)
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates match score as a percentage (0-100) using weighted scoring.
 * Required skills = 2 points, Preferred skills = 1 point.
 */
function calculateMatchScore(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: 'required' | 'preferred' }>
): number {
  if (jobRequiredSkills.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const jobSkill of jobRequiredSkills) {
    const weight = jobSkill.importance === 'required' ? 2 : 1;
    totalWeight += weight;

    const hasMatch = applicantSkills.some((applicantSkill) =>
      skillsMatch(applicantSkill, jobSkill.skill_name)
    );

    if (hasMatch) {
      matchedWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  const rawPercentage = (matchedWeight / totalWeight) * 100;
  return Math.min(100, Math.max(0, Math.round(rawPercentage)));
}

/**
 * Analyzes the ROI (Return on Investment) of learning each missing skill.
 *
 * Simulates adding each missing skill one at a time to the applicant's profile,
 * recalculates the match score, computes the score delta, and returns the top N
 * results sorted by delta descending (highest improvement first).
 *
 * @param applicantSkills - The applicant's current skill list
 * @param jobRequiredSkills - The job's required/preferred skills with importance
 * @param missingSkills - Skills the applicant is missing for this job
 * @param topN - Maximum number of results to return (default: 5)
 * @returns Promise resolving to sorted SkillROIResult array
 */
export async function analyzeSkillROI(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: 'required' | 'preferred' }>,
  missingSkills: string[],
  topN: number = 5
): Promise<SkillROIResult[]> {
  // Calculate the current match score
  const currentScore = calculateMatchScore(applicantSkills, jobRequiredSkills);

  // Simulate adding each missing skill one at a time
  const results: SkillROIResult[] = [];

  for (const skill of missingSkills) {
    // Create a simulated skill set with this one skill added
    const simulatedSkills = [...applicantSkills, skill];

    // Recalculate match score with the simulated skill addition
    const projectedScore = calculateMatchScore(simulatedSkills, jobRequiredSkills);

    // Compute the score delta
    const scoreDelta = projectedScore - currentScore;

    results.push({
      skillName: skill,
      currentScore,
      projectedScore,
      scoreDelta,
    });
  }

  // Sort by delta descending (highest improvement first)
  results.sort((a, b) => b.scoreDelta - a.scoreDelta);

  // Return top N results
  return results.slice(0, topN);
}
