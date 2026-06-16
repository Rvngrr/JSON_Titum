/**
 * TypeScript types and interfaces for the Job Application System.
 *
 * Defines the Application domain model and the ApplicationService contract
 * for managing job applications (create, check status, list).
 */

// ============================================================================
// Domain Types
// ============================================================================

/**
 * A job application record linking an applicant to a job description.
 * Mapped to the `applications` database table.
 */
export interface Application {
  /** UUID primary key */
  id: string;
  /** UUID of the applicant who submitted the application */
  applicant_id: string;
  /** UUID of the job description applied to */
  job_description_id: string;
  /** ISO timestamp of when the application was submitted */
  created_at: string;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Service contract for managing job applications.
 * Handles creation, existence checks, and listing of applications.
 */
export interface ApplicationService {
  /** Create a new application. Throws if duplicate or job not published. */
  createApplication(applicantId: string, jobId: string): Promise<Application>;

  /** Check if an applicant has applied to a specific job. */
  hasApplied(applicantId: string, jobId: string): Promise<boolean>;

  /** Get application statuses for multiple jobs (batch). Returns a Set of applied job IDs. */
  getAppliedJobIds(applicantId: string, jobIds: string[]): Promise<Set<string>>;

  /** Get all applications for a job (HR view). */
  getApplicationsForJob(jobId: string): Promise<Application[]>;
}
