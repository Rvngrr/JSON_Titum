/**
 * Profile Change Triggers — recalculates career intelligence metrics
 * when an applicant's profile data changes.
 *
 * When profile data changes:
 * - Recalculate match scores for the applicant against all published jobs
 * - Invalidate LLM cache entries for proficiency_analysis and ats_analysis on resume change
 * - Trigger fresh ATS scoring on next page view (via cache invalidation)
 * - Recalculate Hidden Gem status and At Risk status
 *
 * Requirements: 19.8, 12.7
 */

import { createAdminClient } from '../supabase/server';
import { computeHash } from '../llm/utils';
import { calculateMatch } from '../ai/match-engine';
import { checkAtRiskStatus } from './candidate-scorer';
import { detectHiddenGem } from './hidden-gem-detector';
import type { Skill, JobRequiredSkill } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileChangeResult {
  /** Number of match scores recalculated */
  matchesRecalculated: number;
  /** Number of LLM cache entries invalidated */
  cacheEntriesInvalidated: number;
  /** Updated At Risk status */
  atRiskStatus: { isAtRisk: boolean; highMatchJobCount: number };
  /** Hidden Gem job IDs detected */
  hiddenGemJobIds: string[];
  /** Errors encountered during recalculation */
  errors: string[];
}

export interface ResumeChangeResult extends ProfileChangeResult {
  /** New resume hash after the change */
  newResumeHash: string;
}

// ---------------------------------------------------------------------------
// Main Trigger Functions
// ---------------------------------------------------------------------------

/**
 * Triggers recalculation of all career intelligence metrics for an applicant
 * when their profile data (skills, experience, etc.) changes.
 *
 * This handles non-resume profile changes like adding/removing skills,
 * updating work experience, education, etc.
 *
 * Recalculates:
 * - Match scores against all published jobs
 * - Hidden Gem status for qualifying matches
 * - At Risk status
 *
 * @param applicantId - UUID of the applicant whose profile changed
 * @returns Result summary of all recalculations performed
 */
export async function onProfileChange(applicantId: string): Promise<ProfileChangeResult> {
  const errors: string[] = [];
  let matchesRecalculated = 0;
  const hiddenGemJobIds: string[] = [];

  const supabase = createAdminClient();

  // 1. Fetch applicant's current skills
  const applicantSkills = await fetchApplicantSkills(supabase, applicantId);

  // 2. Fetch all published jobs with their required skills
  const publishedJobs = await fetchPublishedJobsWithSkills(supabase);

  // 3. Recalculate match scores for each job
  for (const job of publishedJobs) {
    try {
      const matchResult = await calculateMatch(applicantSkills, job.requiredSkills);

      // Upsert match result
      const { error: upsertError } = await supabase
        .from('match_results')
        .upsert(
          {
            applicant_id: applicantId,
            job_description_id: job.jobDescriptionId,
            match_percentage: matchResult.matchPercentage,
            matched_skills: matchResult.matchedSkills,
            missing_skills: matchResult.missingSkills,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: 'applicant_id,job_description_id' }
        );

      if (upsertError) {
        errors.push(`Match upsert failed for job ${job.jobDescriptionId}: ${upsertError.message}`);
        continue;
      }

      matchesRecalculated++;

      // 4. Check Hidden Gem status for qualifying matches
      if (matchResult.matchPercentage >= 60 && matchResult.matchPercentage <= 79) {
        const hiddenGemResult = detectHiddenGem(
          matchResult.matchPercentage,
          matchResult.missingSkills
        );
        if (hiddenGemResult.isHiddenGem) {
          hiddenGemJobIds.push(job.jobDescriptionId);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Match calculation failed for job ${job.jobDescriptionId}: ${msg}`);
    }
  }

  // 5. Check At Risk status
  let atRiskStatus = { isAtRisk: false, highMatchJobCount: 0 };
  try {
    const riskResult = await checkAtRiskStatus(applicantId);
    atRiskStatus = {
      isAtRisk: riskResult.isAtRisk,
      highMatchJobCount: riskResult.highMatchJobCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`At Risk check failed: ${msg}`);
  }

  return {
    matchesRecalculated,
    cacheEntriesInvalidated: 0,
    atRiskStatus,
    hiddenGemJobIds,
    errors,
  };
}

/**
 * Triggers full recalculation when an applicant's resume text changes.
 *
 * In addition to the standard profile change recalculations, this also:
 * - Invalidates `llm_results_cache` entries for `proficiency_analysis` (resume hash mismatch)
 * - Invalidates `llm_results_cache` entries for `ats_analysis` keyed by the old resume hash
 * - The next page view will trigger fresh LLM calls for ATS scoring and proficiency analysis
 *
 * @param applicantId - UUID of the applicant whose resume changed
 * @param newResumeText - The updated resume text content
 * @returns Result summary including cache invalidation details
 */
export async function onResumeChange(
  applicantId: string,
  newResumeText: string
): Promise<ResumeChangeResult> {
  const supabase = createAdminClient();
  let cacheEntriesInvalidated = 0;

  // Compute the new resume hash
  const newResumeHash = computeHash(newResumeText);

  // 1. Invalidate proficiency_analysis cache entries for this applicant
  // These are keyed by resume text hash, so entries with old hashes will naturally
  // miss on next access. We proactively delete stale entries to keep the table clean.
  try {
    const { data: proficiencyEntries } = await supabase
      .from('llm_results_cache')
      .select('id, source_hash')
      .eq('operation_type', 'proficiency_analysis')
      .eq('source_id', applicantId);

    if (proficiencyEntries && proficiencyEntries.length > 0) {
      // Delete entries where the source_hash doesn't match the new resume hash
      const staleIds = proficiencyEntries
        .filter(entry => entry.source_hash !== newResumeHash)
        .map(entry => entry.id);

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('llm_results_cache')
          .delete()
          .in('id', staleIds);

        if (!deleteError) {
          cacheEntriesInvalidated += staleIds.length;
        }
      }
    }
  } catch (err) {
    // Non-fatal: cache invalidation failure doesn't block recalculation
    console.error('Failed to invalidate proficiency_analysis cache:', err);
  }

  // 2. Invalidate ats_analysis cache entries that used the old resume hash
  // ATS analysis cache key is: SHA256(resume_text) + job_id + "ats_analysis"
  // We find entries where source_hash doesn't match the new resume hash
  try {
    const { data: atsEntries } = await supabase
      .from('llm_results_cache')
      .select('id, source_hash')
      .eq('operation_type', 'ats_analysis')
      .neq('source_hash', newResumeHash);

    if (atsEntries && atsEntries.length > 0) {
      // We need to identify entries that belong to this applicant.
      // Since ats_analysis uses resume_hash as source_hash, we look for entries
      // whose source_hash corresponds to any previous resume hash of this applicant.
      // The safest approach: find the applicant's skill_profile to get their profile ID,
      // then look for ats_analysis entries with source_id matching their profile or
      // entries with a stale source_hash that was their previous resume.

      // Get the applicant's previous resume hash from their skill profile
      const { data: profile } = await supabase
        .from('skill_profiles')
        .select('id, resume_text')
        .eq('user_id', applicantId)
        .maybeSingle();

      if (profile?.resume_text) {
        const oldResumeHash = computeHash(profile.resume_text);

        // Delete ats_analysis entries that used the old resume hash
        if (oldResumeHash !== newResumeHash) {
          const { data: staleAtsEntries } = await supabase
            .from('llm_results_cache')
            .select('id')
            .eq('operation_type', 'ats_analysis')
            .eq('source_hash', oldResumeHash);

          if (staleAtsEntries && staleAtsEntries.length > 0) {
            const staleIds = staleAtsEntries.map(entry => entry.id);
            const { error: deleteError } = await supabase
              .from('llm_results_cache')
              .delete()
              .in('id', staleIds);

            if (!deleteError) {
              cacheEntriesInvalidated += staleIds.length;
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal: cache invalidation failure doesn't block recalculation
    console.error('Failed to invalidate ats_analysis cache:', err);
  }

  // 3. Perform standard profile change recalculations (match scores, hidden gem, at risk)
  const profileResult = await onProfileChange(applicantId);

  return {
    ...profileResult,
    cacheEntriesInvalidated: cacheEntriesInvalidated + profileResult.cacheEntriesInvalidated,
    newResumeHash,
  };
}

// ---------------------------------------------------------------------------
// Database Helpers
// ---------------------------------------------------------------------------

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Fetches an applicant's skills from the database.
 */
async function fetchApplicantSkills(
  supabase: AdminClient,
  applicantId: string
): Promise<Skill[]> {
  // Get the skill profile for this applicant
  const { data: skillProfile } = await supabase
    .from('skill_profiles')
    .select('id')
    .eq('user_id', applicantId)
    .maybeSingle();

  if (!skillProfile) {
    return [];
  }

  // Get all skills for that profile
  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('skill_profile_id', skillProfile.id);

  return (skills as Skill[]) || [];
}

/**
 * Fetches all published jobs with their required skills.
 */
async function fetchPublishedJobsWithSkills(
  supabase: AdminClient
): Promise<Array<{ jobDescriptionId: string; requiredSkills: JobRequiredSkill[] }>> {
  const { data: jobs } = await supabase
    .from('job_descriptions')
    .select('id')
    .eq('status', 'published');

  if (!jobs || jobs.length === 0) {
    return [];
  }

  const results: Array<{ jobDescriptionId: string; requiredSkills: JobRequiredSkill[] }> = [];

  for (const job of jobs) {
    const { data: jobSkills } = await supabase
      .from('job_required_skills')
      .select('*')
      .eq('job_description_id', job.id);

    results.push({
      jobDescriptionId: job.id,
      requiredSkills: (jobSkills as JobRequiredSkill[]) || [],
    });
  }

  return results;
}
