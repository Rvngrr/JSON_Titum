import { createAdminClient } from "../supabase/server";
import type { CachedResponse } from "./types";

/**
 * Retrieves a cached API response matching the given query, location, and API source.
 * Returns null if no cached response exists for the given parameters.
 *
 * @param query - The search query used for the API call
 * @param location - The location filter used for the API call
 * @param apiSource - The API source ('jsearch' or 'indeed')
 * @returns The cached response or null if not found
 */
export async function getCachedResponse(
  query: string,
  location: string,
  apiSource: string
): Promise<CachedResponse | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_response_cache")
    .select("id, query, location, api_source, raw_response, fetched_at, job_count")
    .eq("query", query)
    .eq("location", location)
    .eq("api_source", apiSource)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to retrieve cached response: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    query: data.query,
    location: data.location,
    apiSource: data.api_source as "jsearch" | "indeed",
    rawResponse: data.raw_response as Record<string, unknown>,
    fetchedAt: data.fetched_at,
    jobCount: data.job_count,
  };
}

/**
 * Stores a complete raw API response in the cache.
 * Uses an upsert with the unique constraint on (query, location, api_source)
 * so that subsequent stores for the same parameters update the existing record.
 *
 * @param query - The search query used for the API call
 * @param location - The location filter used for the API call
 * @param apiSource - The API source ('jsearch' or 'indeed')
 * @param response - The complete raw JSON response from the external API
 * @returns The stored cached response record
 */
export async function storeCachedResponse(
  query: string,
  location: string,
  apiSource: string,
  response: Record<string, unknown>
): Promise<CachedResponse> {
  const supabase = createAdminClient();

  // Determine job count from the response data array if present
  const jobCount = Array.isArray((response as { data?: unknown }).data)
    ? (response as { data: unknown[] }).data.length
    : 0;

  const { data, error } = await supabase
    .from("api_response_cache")
    .upsert(
      {
        query,
        location,
        api_source: apiSource,
        raw_response: response,
        job_count: jobCount,
        fetched_at: new Date().toISOString(),
      },
      {
        onConflict: "query,location,api_source",
      }
    )
    .select("id, query, location, api_source, raw_response, fetched_at, job_count")
    .single();

  if (error) {
    throw new Error(`Failed to store cached response: ${error.message}`);
  }

  return {
    id: data.id,
    query: data.query,
    location: data.location,
    apiSource: data.api_source as "jsearch" | "indeed",
    rawResponse: data.raw_response as Record<string, unknown>,
    fetchedAt: data.fetched_at,
    jobCount: data.job_count,
  };
}
