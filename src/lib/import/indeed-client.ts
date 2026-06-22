import type { JSearchJob, JSearchResponse } from './types';

const INDEED_API_HOST = 'indeed12.p.rapidapi.com';
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Fetches job listings from the Indeed API via RapidAPI.
 *
 * @param query - The search term for job listings (e.g. "software developer")
 * @param location - The location filter (e.g. "Philippines")
 * @returns A JSearchResponse-compatible object containing job listings
 * @throws Error with descriptive message on configuration, network, or API errors
 */
export async function fetchIndeedJobs(query: string, location: string): Promise<JSearchResponse> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Configuration error: RAPIDAPI_KEY environment variable is missing or empty.'
    );
  }

  // Indeed API uses a different endpoint structure
  const params = new URLSearchParams({
    query: query,
    location: location,
    page_id: '1',
    locality: 'us',
    fromage: '14',
    radius: '50',
  });

  const url = `https://${INDEED_API_HOST}/jobs/search?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': INDEED_API_HOST,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Indeed API authentication failed (HTTP ${response.status}): ` +
          'The RAPIDAPI_KEY may be invalid or you are not subscribed to Indeed API.'
        );
      }

      if (response.status === 429) {
        throw new Error(
          'Indeed API rate limit exceeded (HTTP 429): Please wait before retrying.'
        );
      }

      throw new Error(
        `Indeed API request failed (HTTP ${response.status}): ${errorBody || response.statusText}`
      );
    }

    const data = await response.json();
    const jobs: JSearchJob[] = normalizeIndeedJobs(data);

    return {
      status: 'OK',
      data: jobs,
      request_id: `indeed-${Date.now()}`,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Indeed API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`
      );
    }

    if (error instanceof Error && (
      error.message.startsWith('Indeed API') ||
      error.message.startsWith('Configuration error')
    )) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Indeed API request failed unexpectedly: ${message}`);
  }
}

/**
 * Normalizes Indeed API response into JSearchJob format.
 */
function normalizeIndeedJobs(data: unknown): JSearchJob[] {
  // Indeed API can return { hits: [...] } or array directly
  let items: unknown[];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.hits)) {
      items = obj.hits;
    } else if (Array.isArray(obj.results)) {
      items = obj.results;
    } else if (Array.isArray(obj.jobs)) {
      items = obj.jobs;
    } else {
      return [];
    }
  } else {
    return [];
  }

  return items
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      job_id: String(item.id || item.job_id || item.jobkey || `indeed-${Date.now()}-${Math.random()}`),
      job_title: String(item.title || item.job_title || 'Untitled'),
      employer_name: String(item.company_name || item.company || item.employer_name || 'Unknown'),
      employer_logo: (item.company_logo as string) || null,
      job_description: String(item.description || item.snippet || item.job_description || ''),
      job_city: String(item.city || item.location_city || item.job_city || ''),
      job_state: String(item.state || item.location_state || ''),
      job_country: String(item.country || 'US'),
      job_employment_type: String(item.employment_type || item.job_type || 'full-time'),
      job_apply_link: String(item.url || item.link || item.job_apply_link || ''),
      job_highlights: {
        Qualifications: Array.isArray(item.qualifications) ? item.qualifications as string[] : undefined,
        Responsibilities: undefined,
        Benefits: undefined,
      },
      job_min_salary: typeof item.salary_min === 'number' ? item.salary_min : null,
      job_max_salary: typeof item.salary_max === 'number' ? item.salary_max : null,
      job_salary_currency: (item.salary_currency as string) || null,
      job_salary_period: (item.salary_period as string) || null,
      job_posted_at_datetime_utc: String(item.posted_at || item.date || new Date().toISOString()),
    }));
}
