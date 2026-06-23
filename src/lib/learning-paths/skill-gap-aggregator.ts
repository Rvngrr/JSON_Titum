/**
 * Skill Gap Aggregator Module
 *
 * Merges missing skills from match results and career goal role readiness,
 * deduplicates case-insensitively, labels sources, and ranks by job frequency.
 */

import type { MatchResult } from '@/types';
import type { AggregatedSkillGap } from './types';

/**
 * Aggregates skill gaps from match results and optional role readiness data.
 *
 * - Extracts all missing skills from matchResults[].missing_skills arrays
 * - Counts frequency of each skill (how many jobs require it)
 * - If roleReadiness is provided, merges its missing skills array
 * - Deduplicates case-insensitively
 * - Labels each skill's source: "Job Matches", "Career Goal", or "Both"
 * - Ranks by jobCount descending, caps at 10
 *
 * @param matchResults - Array of match results containing missing_skills
 * @param roleReadiness - Optional role readiness object with missing skills from career goal
 * @returns Aggregated and ranked skill gaps, capped at 10
 */
export function aggregateSkillGaps(
  matchResults: MatchResult[],
  roleReadiness: { missing: string[] } | null
): AggregatedSkillGap[] {
  const totalJobs = matchResults.length;

  // Count how many jobs require each skill (case-insensitive)
  // Track the "display" name (first occurrence casing)
  const jobSkillCounts = new Map<string, { displayName: string; count: number }>();

  for (const result of matchResults) {
    for (const skill of result.missing_skills) {
      const key = skill.toLowerCase();
      const existing = jobSkillCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        jobSkillCounts.set(key, { displayName: skill, count: 1 });
      }
    }
  }

  // Build a set of career goal skills (case-insensitive keys)
  const careerGoalSkillKeys = new Set<string>();
  const careerGoalDisplayNames = new Map<string, string>();

  if (roleReadiness) {
    for (const skill of roleReadiness.missing) {
      const key = skill.toLowerCase();
      careerGoalSkillKeys.add(key);
      if (!careerGoalDisplayNames.has(key)) {
        careerGoalDisplayNames.set(key, skill);
      }
    }
  }

  // Merge all unique skill keys from both sources
  const allSkillKeys = new Set<string>([
    ...jobSkillCounts.keys(),
    ...careerGoalSkillKeys,
  ]);

  // Build aggregated skill gaps with correct source labels
  const aggregated: AggregatedSkillGap[] = [];

  for (const key of allSkillKeys) {
    const inJobMatches = jobSkillCounts.has(key);
    const inCareerGoal = careerGoalSkillKeys.has(key);

    let source: AggregatedSkillGap['source'];
    if (inJobMatches && inCareerGoal) {
      source = 'Both';
    } else if (inJobMatches) {
      source = 'Job Matches';
    } else {
      source = 'Career Goal';
    }

    // Use display name from job matches first (more likely to be seen by user),
    // fall back to career goal display name
    const displayName = inJobMatches
      ? jobSkillCounts.get(key)!.displayName
      : careerGoalDisplayNames.get(key)!;

    const jobCount = inJobMatches ? jobSkillCounts.get(key)!.count : 0;

    aggregated.push({
      skillName: displayName,
      jobCount,
      totalJobs,
      source,
    });
  }

  // Sort by jobCount descending
  aggregated.sort((a, b) => b.jobCount - a.jobCount);

  // Cap at 10
  return aggregated.slice(0, 10);
}

/**
 * Formats a job count display string.
 *
 * @param jobCount - Number of jobs requiring the skill
 * @param totalJobs - Total number of matched jobs
 * @returns Formatted string like "3 of 5 jobs"
 */
export function formatJobCount(jobCount: number, totalJobs: number): string {
  return `${jobCount} of ${totalJobs} jobs`;
}
