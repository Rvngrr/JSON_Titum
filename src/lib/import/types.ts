import type { LLMProvider } from '../llm/types';

/**
 * Options for configuring an import operation.
 */
export interface ImportOptions {
  /** Search query (default: "software developer") */
  query: string;
  /** Location filter (default: "Philippines") */
  location: string;
  /** Bypass cache and fetch fresh data */
  forceRefresh: boolean;
  /** Which external API to use */
  apiSource: 'jsearch' | 'indeed';
  /** ID of the HR user to assign imported jobs to (optional, uses system fallback if not provided) */
  hrUserId?: string;
}

/**
 * Result returned after an import operation completes.
 */
export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedDuplicates: number;
  cacheUsed: boolean;
  cacheTimestamp: string | null;
  warnings: string[];
  error?: string;
}

/**
 * A single job listing as returned by the JSearch API.
 */
export interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_description: string;
  job_city: string;
  job_state: string;
  job_country: string;
  job_employment_type: string;
  job_apply_link: string;
  job_highlights: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string | null;
  job_salary_period: string | null;
  job_posted_at_datetime_utc: string;
}

/**
 * The full response shape from the JSearch API.
 */
export interface JSearchResponse {
  status: string;
  data: JSearchJob[];
  request_id: string;
}

/**
 * A cached API response stored in the database.
 */
export interface CachedResponse {
  id: string;
  query: string;
  location: string;
  apiSource: 'jsearch' | 'indeed';
  rawResponse: Record<string, unknown>;
  fetchedAt: string;
  jobCount: number;
}

/**
 * Current status of the API rate limit.
 */
export interface RateLimitStatus {
  currentCount: number;
  limit: number;
  remaining: number;
  isExhausted: boolean;
  /** True when >= 180 of 200 requests used */
  isNearLimit: boolean;
  /** ISO timestamp of when the limit resets (month end) */
  resetsAt: string;
}

/**
 * A single skill extracted from a job description.
 */
export interface ExtractedSkill {
  skillName: string;
  importance: 'required' | 'preferred';
  rawText: string;
  confidence: number;
}

/**
 * Metadata about the method used for skill extraction.
 */
export interface SkillExtractionSource {
  method: 'llm' | 'local';
  provider?: LLMProvider;
}

/**
 * The result of extracting skills from a job description.
 */
export interface SkillExtractionResult {
  skills: ExtractedSkill[];
  source: SkillExtractionSource;
}
