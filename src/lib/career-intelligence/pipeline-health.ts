import { createAdminClient } from '../supabase/server';

// --- Types ---

export type PipelineTier = 'top_tier' | 'good_fit' | 'potential' | 'gap';

export interface TierClassification {
  tier: PipelineTier;
  label: string;
  range: string;
  color: string;
}

export interface PipelineHealthSummary {
  jobId: string;
  jobTitle: string;
  tiers: {
    topTier: number;
    goodFit: number;
    potential: number;
    gap: number;
  };
  totalApplicants: number;
}

// --- Tier Classification ---

const TIER_DEFINITIONS: Record<PipelineTier, Omit<TierClassification, 'tier'>> = {
  top_tier: { label: '🟢 Top Tier', range: '90-100%', color: 'green' },
  good_fit: { label: '🟡 Good Fit', range: '75-89%', color: 'yellow' },
  potential: { label: '🟠 Potential', range: '60-74%', color: 'orange' },
  gap: { label: '🔴 Gap', range: '0-59%', color: 'red' },
};

/**
 * Classifies a match percentage into one of the four pipeline tiers.
 * Tiers are mutually exclusive and exhaustive over [0, 100].
 */
export function classifyMatchPercentage(matchPercentage: number): TierClassification {
  const clamped = Math.max(0, Math.min(100, matchPercentage));

  let tier: PipelineTier;
  if (clamped >= 90) {
    tier = 'top_tier';
  } else if (clamped >= 75) {
    tier = 'good_fit';
  } else if (clamped >= 60) {
    tier = 'potential';
  } else {
    tier = 'gap';
  }

  return {
    tier,
    ...TIER_DEFINITIONS[tier],
  };
}

// --- Pipeline Health Aggregation ---

/**
 * Retrieves the pipeline health summary for a single published job listing,
 * aggregating applicant counts by tier based on match percentages.
 */
export async function getPipelineHealth(jobId: string): Promise<PipelineHealthSummary> {
  const supabase = createAdminClient();

  // Fetch the job title
  const { data: job, error: jobError } = await supabase
    .from('job_descriptions')
    .select('id, title')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Fetch all match results for this job
  const { data: matchResults, error: matchError } = await supabase
    .from('match_results')
    .select('match_percentage')
    .eq('job_description_id', jobId);

  if (matchError) {
    throw new Error(`Failed to fetch match results for job ${jobId}: ${matchError.message}`);
  }

  const tiers = { topTier: 0, goodFit: 0, potential: 0, gap: 0 };

  for (const result of matchResults ?? []) {
    const classification = classifyMatchPercentage(result.match_percentage);
    switch (classification.tier) {
      case 'top_tier':
        tiers.topTier++;
        break;
      case 'good_fit':
        tiers.goodFit++;
        break;
      case 'potential':
        tiers.potential++;
        break;
      case 'gap':
        tiers.gap++;
        break;
    }
  }

  return {
    jobId: job.id,
    jobTitle: job.title,
    tiers,
    totalApplicants: (matchResults ?? []).length,
  };
}

/**
 * Retrieves pipeline health summaries for all published job listings.
 * Aggregates applicant counts by tier for each job.
 */
export async function getAllPipelineHealth(): Promise<PipelineHealthSummary[]> {
  const supabase = createAdminClient();

  // Fetch all published jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('job_descriptions')
    .select('id, title')
    .eq('status', 'published');

  if (jobsError) {
    throw new Error(`Failed to fetch published jobs: ${jobsError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    return [];
  }

  const jobIds = jobs.map((j) => j.id);

  // Fetch all match results for these jobs in one query
  const { data: matchResults, error: matchError } = await supabase
    .from('match_results')
    .select('job_description_id, match_percentage')
    .in('job_description_id', jobIds);

  if (matchError) {
    throw new Error(`Failed to fetch match results: ${matchError.message}`);
  }

  // Group match results by job
  const matchesByJob = new Map<string, number[]>();
  for (const result of matchResults ?? []) {
    const existing = matchesByJob.get(result.job_description_id) ?? [];
    existing.push(result.match_percentage);
    matchesByJob.set(result.job_description_id, existing);
  }

  // Build summaries for each job
  const summaries: PipelineHealthSummary[] = jobs.map((job) => {
    const percentages = matchesByJob.get(job.id) ?? [];
    const tiers = { topTier: 0, goodFit: 0, potential: 0, gap: 0 };

    for (const pct of percentages) {
      const classification = classifyMatchPercentage(pct);
      switch (classification.tier) {
        case 'top_tier':
          tiers.topTier++;
          break;
        case 'good_fit':
          tiers.goodFit++;
          break;
        case 'potential':
          tiers.potential++;
          break;
        case 'gap':
          tiers.gap++;
          break;
      }
    }

    return {
      jobId: job.id,
      jobTitle: job.title,
      tiers,
      totalApplicants: percentages.length,
    };
  });

  return summaries;
}
