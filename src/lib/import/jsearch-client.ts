import type { JSearchResponse } from './types';

const JSEARCH_API_HOST = 'jsearch.p.rapidapi.com';
const JSEARCH_API_BASE_URL = `https://${JSEARCH_API_HOST}/search`;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Fetches job listings from the JSearch RapidAPI endpoint.
 *
 * Validates that the RAPIDAPI_KEY environment variable is present,
 * sends a GET request with Philippines locality filters and the provided search query,
 * and returns the parsed response.
 *
 * @param query - The search term for job listings (e.g. "software developer")
 * @param location - The location filter (e.g. "Philippines")
 * @returns The JSearch API response containing job listings
 * @throws Error with descriptive message on configuration, network, or API errors
 */
export async function fetchJobs(query: string, location: string): Promise<JSearchResponse> {
  // Validate RAPIDAPI_KEY is present
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Configuration error: RAPIDAPI_KEY environment variable is missing or empty. ' +
      'Please set it to your RapidAPI key to use the JSearch API.'
    );
  }

  // Build request URL with search query, location filters, and pagination
  const params = new URLSearchParams({
    query: `${query} in ${location}`,
    page: '1',
    num_pages: '1',
    country: 'ph',
  });

  const url = `${JSEARCH_API_BASE_URL}?${params.toString()}`;

  // Create an AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': JSEARCH_API_HOST,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-success HTTP status codes
    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error';
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // Ignore body read errors
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `JSearch API authentication failed (HTTP ${response.status}): ` +
          'The RAPIDAPI_KEY may be invalid or expired. ' +
          `Details: ${errorBody || statusText}`
        );
      }

      if (response.status === 429) {
        throw new Error(
          'JSearch API rate limit exceeded (HTTP 429): ' +
          'Too many requests. Please wait before retrying. ' +
          `Details: ${errorBody || statusText}`
        );
      }

      throw new Error(
        `JSearch API request failed (HTTP ${response.status}): ${errorBody || statusText}`
      );
    }

    // Parse the JSON response
    const data = await response.json();

    // Validate the response structure
    if (!data || typeof data.status !== 'string' || !Array.isArray(data.data)) {
      throw new Error(
        'JSearch API returned an unexpected response format. ' +
        'Expected { status, data: [...], request_id } but received: ' +
        JSON.stringify(data).slice(0, 200)
      );
    }

    return data as JSearchResponse;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `JSearch API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. ` +
        'The external service may be slow or unreachable. Please try again later.'
      );
    }

    // Re-throw errors we've already formatted
    if (error instanceof Error && error.message.startsWith('JSearch API')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Configuration error')) {
      throw error;
    }

    // Handle network/fetch errors
    if (error instanceof TypeError) {
      throw new Error(
        'JSearch API is unreachable: A network error occurred. ' +
        'Please check your internet connection and try again. ' +
        `Details: ${error.message}`
      );
    }

    // Generic fallback for unexpected errors
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JSearch API request failed unexpectedly: ${message}`);
  }
}
