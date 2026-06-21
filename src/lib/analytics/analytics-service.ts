import { createAdminClient } from '../supabase/server';

// --- Types ---

export interface AnalyticsData {
  totalActiveListings: number;
  totalApplicants: number;
  averageMatchScore: number;
  topSkillsInDemand: Array<{ skill: string; count: number }>;
  applicantGrowthTrend: Array<{ month: string; count: number }>;
  skillGapAnalysis: Array<{ skill: string; demandCount: number; supplyCount: number; gapRatio: number }>;
  conversionRate: { applied: number; total: number; rate: number };
}

// --- Analytics Queries ---

/**
 * Retrieves comprehensive analytics data for the HR dashboard.
 * Aggregates metrics from job listings, applicants, match results, and applications.
 *
 * Validates: Requirements 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = createAdminClient();

  const [
    totalActiveListings,
    totalApplicants,
    averageMatchScore,
    topSkillsInDemand,
    applicantGrowthTrend,
    skillGapAnalysis,
    conversionRate,
  ] = await Promise.all([
    getTotalActiveListings(supabase),
    getTotalApplicants(supabase),
    getAverageMatchScore(supabase),
    getTopSkillsInDemand(supabase),
    getApplicantGrowthTrend(supabase),
    getSkillGapAnalysis(supabase),
    getConversionRate(supabase),
  ]);

  return {
    totalActiveListings,
    totalApplicants,
    averageMatchScore,
    topSkillsInDemand,
    applicantGrowthTrend,
    skillGapAnalysis,
    conversionRate,
  };
}

/**
 * Formats analytics data as a CSV string for export.
 *
 * Validates: Requirement 24.8
 */
export function formatAsCSV(data: AnalyticsData): string {
  const lines: string[] = [];

  // Summary section
  lines.push('Metric,Value');
  lines.push(`Total Active Listings,${data.totalActiveListings}`);
  lines.push(`Total Applicants,${data.totalApplicants}`);
  lines.push(`Average Match Score,${data.averageMatchScore}`);
  lines.push(`Conversion Rate (%),${data.conversionRate.rate}`);
  lines.push(`Applicants Who Applied,${data.conversionRate.applied}`);
  lines.push('');

  // Top Skills in Demand
  lines.push('Top Skills in Demand');
  lines.push('Skill,Count');
  for (const entry of data.topSkillsInDemand) {
    lines.push(`${escapeCSV(entry.skill)},${entry.count}`);
  }
  lines.push('');

  // Applicant Growth Trend
  lines.push('Applicant Growth Trend');
  lines.push('Month,Count');
  for (const entry of data.applicantGrowthTrend) {
    lines.push(`${escapeCSV(entry.month)},${entry.count}`);
  }
  lines.push('');

  // Skill Gap Analysis
  lines.push('Skill Gap Analysis');
  lines.push('Skill,Demand Count,Supply Count,Gap Ratio');
  for (const entry of data.skillGapAnalysis) {
    lines.push(
      `${escapeCSV(entry.skill)},${entry.demandCount},${entry.supplyCount},${entry.gapRatio}`
    );
  }

  return lines.join('\n');
}

// --- Internal Query Helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = ReturnType<typeof createAdminClient>;

/**
 * Requirement 24.1: Total published job listings (both imported and manual).
 */
async function getTotalActiveListings(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('job_descriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  if (error) {
    throw new Error(`Failed to fetch active listings count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Requirement 24.2: Total registered applicants.
 */
async function getTotalApplicants(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('skill_profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to fetch total applicants: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Requirement 24.3: Mean match percentage across all applicant-job pairs.
 */
async function getAverageMatchScore(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('match_results')
    .select('match_percentage');

  if (error) {
    throw new Error(`Failed to fetch match scores: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const sum = data.reduce((acc, row) => acc + (row.match_percentage ?? 0), 0);
  return Math.round((sum / data.length) * 10) / 10;
}

/**
 * Requirement 24.4: Top 10 most frequently required skills across published jobs.
 */
async function getTopSkillsInDemand(
  supabase: SupabaseClient
): Promise<Array<{ skill: string; count: number }>> {
  // Get all published job IDs
  const { data: publishedJobs, error: jobsError } = await supabase
    .from('job_descriptions')
    .select('id')
    .eq('status', 'published');

  if (jobsError) {
    throw new Error(`Failed to fetch published jobs: ${jobsError.message}`);
  }

  if (!publishedJobs || publishedJobs.length === 0) {
    return [];
  }

  const jobIds = publishedJobs.map((j) => j.id);

  // Get all required skills for these jobs
  const { data: skills, error: skillsError } = await supabase
    .from('job_required_skills')
    .select('skill_name')
    .in('job_description_id', jobIds);

  if (skillsError) {
    throw new Error(`Failed to fetch job skills: ${skillsError.message}`);
  }

  if (!skills || skills.length === 0) {
    return [];
  }

  // Count occurrences of each skill
  const skillCounts = new Map<string, number>();
  for (const row of skills) {
    const name = row.skill_name;
    skillCounts.set(name, (skillCounts.get(name) ?? 0) + 1);
  }

  // Sort by count descending and take top 10
  return Array.from(skillCounts.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Requirement 24.5: Number of new applicant registrations per week for the last 4 weeks.
 * Uses the `created_at` field from `skill_profiles` to determine registration date.
 */
async function getApplicantGrowthTrend(
  supabase: SupabaseClient
): Promise<Array<{ month: string; count: number }>> {
  const now = new Date();
  const weeks: Array<{ month: string; count: number }> = [];

  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('skill_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    if (error) {
      throw new Error(`Failed to fetch applicant growth trend: ${error.message}`);
    }

    // Format as "MMM DD" for the week start
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weeks.push({ month: label, count: count ?? 0 });
  }

  return weeks;
}

/**
 * Requirement 24.6: Top 5 skills most frequently required by jobs but least held by applicants.
 * Gap ratio = demandCount / max(supplyCount, 1) — higher means bigger gap.
 */
async function getSkillGapAnalysis(
  supabase: SupabaseClient
): Promise<Array<{ skill: string; demandCount: number; supplyCount: number; gapRatio: number }>> {
  // Get all published job IDs
  const { data: publishedJobs, error: jobsError } = await supabase
    .from('job_descriptions')
    .select('id')
    .eq('status', 'published');

  if (jobsError) {
    throw new Error(`Failed to fetch published jobs for skill gap: ${jobsError.message}`);
  }

  if (!publishedJobs || publishedJobs.length === 0) {
    return [];
  }

  const jobIds = publishedJobs.map((j) => j.id);

  // Get demand: skills required by published jobs
  const { data: demandSkills, error: demandError } = await supabase
    .from('job_required_skills')
    .select('skill_name')
    .in('job_description_id', jobIds);

  if (demandError) {
    throw new Error(`Failed to fetch demand skills: ${demandError.message}`);
  }

  // Get supply: skills held by applicants
  const { data: supplySkills, error: supplyError } = await supabase
    .from('skills')
    .select('name');

  if (supplyError) {
    throw new Error(`Failed to fetch supply skills: ${supplyError.message}`);
  }

  // Count demand per skill
  const demandCounts = new Map<string, number>();
  for (const row of demandSkills ?? []) {
    const name = row.skill_name;
    demandCounts.set(name, (demandCounts.get(name) ?? 0) + 1);
  }

  // Count supply per skill
  const supplyCounts = new Map<string, number>();
  for (const row of supplySkills ?? []) {
    const name = row.name;
    supplyCounts.set(name, (supplyCounts.get(name) ?? 0) + 1);
  }

  // Compute gap ratio for each demanded skill
  const gaps = Array.from(demandCounts.entries()).map(([skill, demandCount]) => {
    const supplyCount = supplyCounts.get(skill) ?? 0;
    const gapRatio = Math.round((demandCount / Math.max(supplyCount, 1)) * 100) / 100;
    return { skill, demandCount, supplyCount, gapRatio };
  });

  // Sort by gap ratio descending (biggest gaps first) and take top 5
  return gaps.sort((a, b) => b.gapRatio - a.gapRatio).slice(0, 5);
}

/**
 * Requirement 24.7: Percentage of applicants who have applied to at least one job.
 */
async function getConversionRate(
  supabase: SupabaseClient
): Promise<{ applied: number; total: number; rate: number }> {
  // Total applicants
  const { count: totalCount, error: totalError } = await supabase
    .from('skill_profiles')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    throw new Error(`Failed to fetch total applicants for conversion: ${totalError.message}`);
  }

  const total = totalCount ?? 0;

  if (total === 0) {
    return { applied: 0, total: 0, rate: 0 };
  }

  // Get distinct applicants who have at least one application
  const { data: applicants, error: appError } = await supabase
    .from('applications')
    .select('applicant_id');

  if (appError) {
    throw new Error(`Failed to fetch applications for conversion: ${appError.message}`);
  }

  // Count unique applicants who applied
  const uniqueApplicants = new Set((applicants ?? []).map((a) => a.applicant_id));
  const applied = uniqueApplicants.size;

  const rate = Math.round((applied / total) * 1000) / 10; // One decimal place percentage

  return { applied, total, rate };
}

// --- Utility ---

/**
 * Escapes a value for CSV output by wrapping in quotes if it contains commas or quotes.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
