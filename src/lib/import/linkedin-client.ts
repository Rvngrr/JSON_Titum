import type { JSearchJob, JSearchResponse } from './types';

const LINKEDIN_API_HOST = 'linkedin-job-search-api.p.rapidapi.com';
const LINKEDIN_API_BASE_URL = `https://${LINKEDIN_API_HOST}/active-jb-7d`;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Fetches job listings from the LinkedIn Job Search API via RapidAPI.
 *
 * @param query - The search term for job listings (e.g. "software developer")
 * @param location - The location filter (e.g. "Philippines")
 * @returns A JSearchResponse-compatible object containing job listings
 * @throws Error with descriptive message on configuration, network, or API errors
 */
export async function fetchLinkedInJobs(query: string, location: string): Promise<JSearchResponse> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Configuration error: RAPIDAPI_KEY environment variable is missing or empty. ' +
      'Please set it to your RapidAPI key to use the LinkedIn Job Search API.'
    );
  }

  // Build request URL
  const params = new URLSearchParams({
    title: query,
    location: `"${location}"`,
  });

  const url = `${LINKEDIN_API_BASE_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': LINKEDIN_API_HOST,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `LinkedIn API authentication failed (HTTP ${response.status}): ` +
          'The RAPIDAPI_KEY may be invalid or expired.'
        );
      }

      if (response.status === 429) {
        throw new Error(
          'LinkedIn API rate limit exceeded (HTTP 429): Please wait before retrying.'
        );
      }

      throw new Error(
        `LinkedIn API request failed (HTTP ${response.status}): ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();

    // LinkedIn API returns an array of jobs directly or in a different shape
    // Normalize to JSearchResponse format
    const jobs: JSearchJob[] = normalizeLinkedInJobs(data);

    return {
      status: 'OK',
      data: jobs,
      request_id: `linkedin-${Date.now()}`,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `LinkedIn API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`
      );
    }

    if (error instanceof Error && error.message.startsWith('LinkedIn API')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Configuration error')) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LinkedIn API request failed unexpectedly: ${message}`);
  }
}

/**
 * Normalizes LinkedIn API response into JSearchJob format.
 */
function normalizeLinkedInJobs(data: unknown): JSearchJob[] {
  // Handle array response
  const items = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      job_id: String(item.id || item.job_id || `linkedin-${Date.now()}-${Math.random()}`),
      job_title: String(item.title || item.job_title || 'Untitled'),
      employer_name: String(item.company || item.company_name || item.employer_name || 'Unknown'),
      employer_logo: (item.company_logo as string) || null,
      job_description: String(item.description || item.job_description || ''),
      job_city: String(item.city || item.location_city || ''),
      job_state: String(item.state || item.location_state || ''),
      job_country: String(item.country || 'PH'),
      job_employment_type: String(item.employment_type || item.job_type || 'full-time'),
      job_apply_link: String(item.url || item.apply_link || item.job_apply_link || ''),
      job_highlights: {
        Qualifications: Array.isArray(item.qualifications) ? item.qualifications as string[] : undefined,
        Responsibilities: Array.isArray(item.responsibilities) ? item.responsibilities as string[] : undefined,
        Benefits: Array.isArray(item.benefits) ? item.benefits as string[] : undefined,
      },
      job_min_salary: typeof item.min_salary === 'number' ? item.min_salary : null,
      job_max_salary: typeof item.max_salary === 'number' ? item.max_salary : null,
      job_salary_currency: (item.salary_currency as string) || null,
      job_salary_period: (item.salary_period as string) || null,
      job_posted_at_datetime_utc: String(item.posted_at || item.date_posted || new Date().toISOString()),
    }));
}
