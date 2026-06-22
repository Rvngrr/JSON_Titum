/**
 * Import Service Orchestrator
 *
 * Coordinates the full job import pipeline:
 * 1. Validate configuration (API key presence)
 * 2. Check rate limit
 * 3. Check response cache (or force refresh)
 * 4. Fetch from external API (if needed)
 * 5. Store cache
 * 6. Deduplicate against existing records
 * 7. Map and store new jobs in job_descriptions
 * 8. Extract skills (LLM with local fallback)
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3, 6.2, 6.3
 */

import { createAdminClient } from '../supabase/server';
import { checkRateLimit, incrementRequestCount } from './rate-limiter';
import { getCachedResponse, storeCachedResponse } from './response-cache';
import { fetchJobs } from './jsearch-client';
import { findExistingExternalIds, isNewJob } from './deduplication';
import { extractSkillsFromJob, insertSkillsForJob } from './skill-extractor';
import type { ImportOptions, ImportResult, JSearchJob, JSearchResponse } from './types';

// ---------------------------------------------------------------------------
// System User resolution
// ---------------------------------------------------------------------------

/** Default fallback UUID for the system user if none configured */
const FALLBACK_SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Resolves the system user ID to assign imported jobs to.
 * Priority: SYSTEM_USER_ID env var → query profiles table → hardcoded fallback
 */
async function getSystemUserId(): Promise<string> {
  // 1. Check environment variable
  const envUserId = process.env.SYSTEM_USER_ID;
  if (envUserId && envUserId.trim() !== '') {
    return envUserId.trim();
  }

  // 2. Query for a system user in the profiles table
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'system')
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      return data.id;
    }

    // Try looking for an hr_user as fallback if no system role exists
    const { data: hrData } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'hr_user')
      .limit(1)
      .maybeSingle();

    if (hrData?.id) {
      return hrData.id;
    }
  } catch (error) {
    console.warn('[ImportService] Failed to query system user from profiles:', error);
  }

  // 3. Hardcoded fallback
  return FALLBACK_SYSTEM_USER_ID;
}

// ---------------------------------------------------------------------------
// Job mapping
// ---------------------------------------------------------------------------

/**
 * Maps a JSearchJob to the shape expected by the job_descriptions table insert.
 */
export function mapJobToRecord(
  job: JSearchJob,
  systemUserId: string,
  apiSource: 'jsearch' | 'indeed'
) {
  const sourceLabel = apiSource === 'jsearch' ? 'via JSearch' : 'via Indeed';

  return {
    title: job.job_title,
    description: job.job_description,
    hr_user_id: systemUserId,
    status: 'published',
    external_job_id: job.job_id,
    source: apiSource,
    source_company: job.employer_name,
    job_link: job.job_apply_link,
    salary_min: job.job_min_salary,
    salary_max: job.job_max_salary,
    salary_currency: job.job_salary_currency,
    salary_period: job.job_salary_period,
    employment_type: job.job_employment_type,
    location_city: job.job_city,
    location_state: job.job_state,
    highlights: job.job_highlights ?? null,
    imported_at: new Date().toISOString(),
    // Store source attribution in description context
    // The source_company + source + job_link fields already provide attribution
    // Additional "via JSearch"/"via Indeed" indicator is in the `source` field
    qualifications: buildQualificationsText(job, sourceLabel),
  };
}

/**
 * Builds a qualifications text from job highlights.
 */
function buildQualificationsText(job: JSearchJob, sourceLabel: string): string | null {
  const parts: string[] = [];

  if (job.job_highlights?.Qualifications?.length) {
    parts.push(job.job_highlights.Qualifications.join('\n'));
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full job import pipeline.
 *
 * @param options - Import configuration options
 * @returns ImportResult with counts, cache status, and any warnings
 */
export async function importJobs(options: ImportOptions): Promise<ImportResult> {
  const warnings: string[] = [];

  // --- Step 1: Validate configuration ---
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      importedCount: 0,
      skippedDuplicates: 0,
      cacheUsed: false,
      cacheTimestamp: null,
      warnings: [],
      error: 'Configuration error: RAPIDAPI_KEY environment variable is missing or empty.',
    };
  }

  // --- Step 2: Check rate limit ---
  const rateLimitStatus = await checkRateLimit();

  if (rateLimitStatus.isExhausted) {
    return {
      success: false,
      importedCount: 0,
      skippedDuplicates: 0,
      cacheUsed: false,
      cacheTimestamp: null,
      warnings: [],
      error: `API quota exhausted: ${rateLimitStatus.currentCount}/${rateLimitStatus.limit} requests used this month. Resets at ${rateLimitStatus.resetsAt}.`,
    };
  }

  if (rateLimitStatus.isNearLimit) {
    warnings.push(
      `API quota nearly exhausted: ${rateLimitStatus.currentCount}/${rateLimitStatus.limit} requests used this month (${rateLimitStatus.remaining} remaining).`
    );
  }

  // --- Step 3: Check cache ---
  let jobs: JSearchJob[];
  let cacheUsed = false;
  let cacheTimestamp: string | null = null;

  if (!options.forceRefresh) {
    try {
      const cached = await getCachedResponse(
        options.query,
        options.location,
        options.apiSource
      );

      if (cached) {
        // Use cached data
        const rawResponse = cached.rawResponse as unknown as JSearchResponse;
        jobs = rawResponse.data || [];
        cacheUsed = true;
        cacheTimestamp = cached.fetchedAt;
      } else {
        // No cache — need to fetch
        jobs = await fetchAndCache(options, warnings);
      }
    } catch (error) {
      // Cache read failed — try to fetch fresh
      console.warn('[ImportService] Cache read failed, fetching fresh:', error);
      jobs = await fetchAndCache(options, warnings);
    }
  } else {
    // Force refresh — bypass cache
    jobs = await fetchAndCache(options, warnings);
  }

  // Handle case where fetch failed (fetchAndCache returns empty and adds error to warnings)
  // Check if jobs is undefined (fetch error was caught inside fetchAndCache)
  if (!jobs) {
    return {
      success: false,
      importedCount: 0,
      skippedDuplicates: 0,
      cacheUsed,
      cacheTimestamp,
      warnings,
      error: warnings.length > 0 ? warnings[warnings.length - 1] : 'Failed to fetch jobs from external API.',
    };
  }

  if (jobs.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedDuplicates: 0,
      cacheUsed,
      cacheTimestamp,
      warnings,
    };
  }

  // --- Step 4: Deduplicate ---
  const externalIds = jobs.map((job) => job.job_id);
  const existingIds = await findExistingExternalIds(externalIds);

  const newJobs = jobs.filter((job) => isNewJob(job.job_id, existingIds));
  const skippedDuplicates = jobs.length - newJobs.length;

  if (newJobs.length === 0) {
    return {
      success: true,
      importedCount: 0,
      skippedDuplicates,
      cacheUsed,
      cacheTimestamp,
      warnings,
    };
  }

  // --- Step 5: Map and store new jobs ---
  const systemUserId = await getSystemUserId();
  const supabase = createAdminClient();
  let importedCount = 0;
  let usedLocalFallback = false;

  for (const job of newJobs) {
    try {
      // Map job to database record
      const record = mapJobToRecord(job, systemUserId, options.apiSource);

      // Insert into job_descriptions
      const { data: insertedJob, error: insertError } = await supabase
        .from('job_descriptions')
        .insert(record)
        .select('id')
        .single();

      if (insertError) {
        console.error(
          `[ImportService] Failed to insert job "${job.job_title}" (${job.job_id}):`,
          insertError.message
        );
        warnings.push(`Failed to import job "${job.job_title}": ${insertError.message}`);
        continue; // Continue processing remaining jobs on individual errors
      }

      // --- Step 6: Extract skills ---
      try {
        const highlightTexts = [
          ...(job.job_highlights?.Qualifications || []),
          ...(job.job_highlights?.Responsibilities || []),
        ];

        const extractionResult = await extractSkillsFromJob(
          job.job_description,
          job.job_highlights?.Qualifications?.join('\n') || null,
          highlightTexts
        );

        if (extractionResult.source.method === 'local') {
          usedLocalFallback = true;
        }

        // Insert extracted skills
        if (extractionResult.skills.length > 0 && insertedJob?.id) {
          await insertSkillsForJob(insertedJob.id, extractionResult.skills);
        }
      } catch (skillError) {
        // Skill extraction failure is non-fatal — job is still imported
        console.warn(
          `[ImportService] Skill extraction failed for job "${job.job_title}" (${job.job_id}):`,
          skillError
        );
        warnings.push(
          `Skill extraction failed for job "${job.job_title}". Job was imported without skills.`
        );
      }

      importedCount++;
    } catch (jobError) {
      // Individual job processing failure — continue with remaining jobs
      console.error(
        `[ImportService] Unexpected error processing job "${job.job_title}" (${job.job_id}):`,
        jobError
      );
      warnings.push(`Unexpected error processing job "${job.job_title}".`);
    }
  }

  // Add LLM fallback warning if applicable
  if (usedLocalFallback) {
    warnings.push(
      'LLM service was unavailable for skill extraction. Local keyword matching was used as fallback — extracted skills may be less comprehensive.'
    );
  }

  return {
    success: true,
    importedCount,
    skippedDuplicates,
    cacheUsed,
    cacheTimestamp,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetches jobs from the external API and stores the response in the cache.
 * Increments the rate limit counter after a successful fetch.
 *
 * @returns Array of JSearchJob items from the API response
 * @throws Error if the API request fails
 */
async function fetchAndCache(
  options: ImportOptions,
  warnings: string[]
): Promise<JSearchJob[]> {
  try {
    const response = await fetchJobs(options.query, options.location);

    // Increment rate limit counter after successful fetch
    await incrementRequestCount();

    // Store in cache
    try {
      await storeCachedResponse(
        options.query,
        options.location,
        options.apiSource,
        response as unknown as Record<string, unknown>
      );
    } catch (cacheError) {
      // Cache write failure is non-fatal
      console.warn('[ImportService] Failed to store response in cache:', cacheError);
      warnings.push('Failed to cache API response. The import will continue but the response is not cached.');
    }

    return response.data || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ImportService] API fetch failed:', message);
    throw new Error(message);
  }
}
