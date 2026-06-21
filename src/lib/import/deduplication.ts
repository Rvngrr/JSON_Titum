import { createAdminClient } from "../supabase/server";

/**
 * Queries the job_descriptions table for existing external_job_id values
 * and returns them as a Set for O(1) lookup during deduplication.
 *
 * @param externalIds - Array of external job IDs to check against the database
 * @returns A Set of external IDs that already exist in the database
 */
export async function findExistingExternalIds(
  externalIds: string[]
): Promise<Set<string>> {
  if (externalIds.length === 0) {
    return new Set();
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("job_descriptions")
    .select("external_job_id")
    .in("external_job_id", externalIds)
    .not("external_job_id", "is", null);

  if (error) {
    throw new Error(
      `Failed to query existing external job IDs: ${error.message}`
    );
  }

  const existingIds = new Set<string>();
  if (data) {
    for (const row of data) {
      if (row.external_job_id) {
        existingIds.add(row.external_job_id);
      }
    }
  }

  return existingIds;
}

/**
 * Checks whether a given external job ID is new (not already imported).
 *
 * @param externalId - The external job ID to check
 * @param existingIds - Set of already-imported external IDs
 * @returns true if the job is new and should be imported, false if it already exists
 */
export function isNewJob(
  externalId: string,
  existingIds: Set<string>
): boolean {
  return !existingIds.has(externalId);
}
