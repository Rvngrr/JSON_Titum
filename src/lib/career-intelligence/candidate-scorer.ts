/**
 * Candidate Scorer — calculates "Ready Now" and "High Potential" scores
 * plus "At Risk" status for applicants.
 *
 * Scoring logic (same as match engine):
 * - Required skill matched = 2 points
 * - Preferred skill matched = 1 point
 * - Score = (earned points / max points) * 100
 *
 * "High Potential" simulates adding the 2 easiest missing skills and
 * recalculates the match percentage.
 *
 * "At Risk" flags applicants who match 85%+ on 3 or more published jobs.
 *
 * This is a pure local algorithm — no LLM calls.
 */

import type { CandidateScore, AtRiskStatus } from './types';
import { classifySkillDifficulty } from './hidden-gem-detector';
import { createAdminClient } from '../supabase/server';

// ============================================================================
// Scoring Helpers
// ============================================================================

/**
 * Calculates the match percentage using the weighted scoring logic.
 * Required = 2 points, Preferred = 1 point.
 * Score = (earned / max) * 100, rounded to nearest integer, clamped [0, 100].
 */
function calculateMatchPercentage(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: 'required' | 'preferred' }>
): number {
  if (jobRequiredSkills.length === 0) {
    return 0;
  }

  const normalizedApplicantSkills = applicantSkills.map(s => s.toLowerCase().trim());

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const jobSkill of jobRequiredSkills) {
    const weight = jobSkill.importance === 'required' ? 2 : 1;
    totalWeight += weight;

    const normalizedJobSkill = jobSkill.skill_name.toLowerCase().trim();
    const isMatched = normalizedApplicantSkills.some(
      applicantSkill => applicantSkill === normalizedJobSkill
    );

    if (isMatched) {
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
 * Identifies missing skills from the job requirements that the applicant doesn't have.
 */
function getMissingSkills(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: 'required' | 'preferred' }>
): string[] {
  const normalizedApplicantSkills = applicantSkills.map(s => s.toLowerCase().trim());

  return jobRequiredSkills
    .filter(jobSkill => {
      const normalizedJobSkill = jobSkill.skill_name.toLowerCase().trim();
      return !normalizedApplicantSkills.some(s => s === normalizedJobSkill);
    })
    .map(jobSkill => jobSkill.skill_name);
}

/**
 * Finds the N easiest missing skills based on the skill difficulty catalog.
 * Easy skills are returned first; if fewer than N easy skills exist,
 * remaining slots are not filled with hard skills.
 */
function findEasiestMissingSkills(missingSkills: string[], count: number): string[] {
  const easySkills: string[] = [];
  const hardSkills: string[] = [];

  for (const skill of missingSkills) {
    const difficulty = classifySkillDifficulty(skill);
    if (difficulty === 'easy') {
      easySkills.push(skill);
    } else {
      hardSkills.push(skill);
    }
  }

  // Return up to `count` easiest skills — prefer easy, then fill with hard if needed
  const result: string[] = [];
  for (const skill of easySkills) {
    if (result.length >= count) break;
    result.push(skill);
  }
  for (const skill of hardSkills) {
    if (result.length >= count) break;
    result.push(skill);
  }

  return result;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Calculates "Ready Now" and "High Potential" scores for an applicant-job pair.
 *
 * - "Ready Now" = current match percentage
 * - "High Potential" = match percentage after simulating addition of 2 easiest missing skills
 * - "isHighGrowth" = true when (highPotentialScore - readyNowScore) >= 10
 *
 * @param applicantSkills - Array of skill names from the applicant's profile
 * @param jobRequiredSkills - Array of job skill requirements with importance
 * @returns CandidateScore with both scores and growth indicator
 */
export async function calculateCandidateScores(
  applicantSkills: string[],
  jobRequiredSkills: Array<{ skill_name: string; importance: 'required' | 'preferred' }>
): Promise<CandidateScore> {
  // Calculate "Ready Now" score (current match)
  const readyNowScore = calculateMatchPercentage(applicantSkills, jobRequiredSkills);

  // Find missing skills
  const missingSkills = getMissingSkills(applicantSkills, jobRequiredSkills);

  // Find the 2 easiest missing skills
  const easiestSkillsToLearn = findEasiestMissingSkills(missingSkills, 2);

  // Calculate "High Potential" score by simulating addition of 2 easiest missing skills
  let highPotentialScore = readyNowScore;

  if (easiestSkillsToLearn.length > 0) {
    // Simulate adding the easiest skills to the applicant's profile
    const simulatedSkills = [...applicantSkills, ...easiestSkillsToLearn];
    highPotentialScore = calculateMatchPercentage(simulatedSkills, jobRequiredSkills);
  }

  // Determine if high growth (difference >= 10 points)
  const isHighGrowth = (highPotentialScore - readyNowScore) >= 10;

  return {
    readyNowScore,
    highPotentialScore,
    isHighGrowth,
    easiestSkillsToLearn,
  };
}

/**
 * Checks "At Risk" status for an applicant.
 *
 * An applicant is "At Risk" when they match 85%+ on 3 or more published jobs.
 * This queries the match_results table for high-scoring matches against published jobs.
 *
 * @param applicantId - UUID of the applicant to check
 * @returns AtRiskStatus with risk flag and match count
 */
export async function checkAtRiskStatus(applicantId: string): Promise<AtRiskStatus> {
  const threshold = 3;
  const matchThreshold = 85;

  const supabase = createAdminClient();

  // Query match_results for this applicant with score >= 85%
  // Join with job_descriptions to only count published jobs
  const { data: highMatches, error } = await supabase
    .from('match_results')
    .select(`
      id,
      match_percentage,
      job_description_id,
      job_descriptions!inner (
        id,
        status
      )
    `)
    .eq('applicant_id', applicantId)
    .gte('match_percentage', matchThreshold)
    .eq('job_descriptions.status', 'published');

  if (error) {
    // If there's a database error, fail safely (not at risk)
    console.error('Error checking at-risk status:', error);
    return {
      isAtRisk: false,
      highMatchJobCount: 0,
      threshold,
    };
  }

  const highMatchJobCount = highMatches?.length ?? 0;
  const isAtRisk = highMatchJobCount >= threshold;

  return {
    isAtRisk,
    highMatchJobCount,
    threshold,
  };
}
