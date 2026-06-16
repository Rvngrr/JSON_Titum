import { createClient } from "../supabase/server";
import type { Application } from "./types";

/**
 * Creates a new application for an applicant to a job.
 * Validates that the job is in "published" status before inserting.
 * Handles duplicate constraint violations (Postgres error code 23505).
 *
 * @throws Error with message "Job is not published" if job status !== "published"
 * @throws Error with message "You have already applied to this job" on duplicate
 * @throws Error with descriptive message on other failures
 */
export async function createApplication(
  applicantId: string,
  jobId: string
): Promise<Application> {
  const supabase = await createClient();

  // Validate that the job exists and is published
  const { data: job, error: jobError } = await supabase
    .from("job_descriptions")
    .select("id, status")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw new Error("Job not found");
  }

  if (job.status !== "published") {
    throw new Error("Job is not published");
  }

  // Insert the application record
  const { data, error } = await supabase
    .from("applications")
    .insert({
      applicant_id: applicantId,
      job_description_id: jobId,
    })
    .select()
    .single();

  if (error) {
    // Postgres unique constraint violation
    if (error.code === "23505") {
      throw new Error("You have already applied to this job");
    }
    // Table does not exist (PostgreSQL relation error)
    if (error.message && error.message.includes("relation")) {
      throw new Error(
        "The applications table does not exist. Please run the database migration to create it."
      );
    }
    throw new Error(`Failed to create application: ${error.message}`);
  }

  return data as Application;
}

/**
 * Checks whether an applicant has already applied to a specific job.
 */
export async function hasApplied(
  applicantId: string,
  jobId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", applicantId)
    .eq("job_description_id", jobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check application status: ${error.message}`);
  }

  return data !== null;
}

/**
 * Batch query that returns a Set of job IDs the applicant has applied to,
 * filtered from the provided list of job IDs.
 */
export async function getAppliedJobIds(
  applicantId: string,
  jobIds: string[]
): Promise<Set<string>> {
  if (jobIds.length === 0) {
    return new Set();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("job_description_id")
    .eq("applicant_id", applicantId)
    .in("job_description_id", jobIds);

  if (error) {
    throw new Error(`Failed to fetch applied job IDs: ${error.message}`);
  }

  return new Set(data.map((row) => row.job_description_id));
}

/**
 * Fetches all applications for a given job (used by HR users).
 */
export async function getApplicationsForJob(
  jobId: string
): Promise<Application[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("job_description_id", jobId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch applications for job: ${error.message}`
    );
  }

  return data as Application[];
}
