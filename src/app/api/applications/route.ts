import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApplication } from "@/lib/applications/service";
import type { ApplicationStatus } from "@/lib/applications/types";

/**
 * Valid application statuses accepted by this route.
 */
const VALID_STATUSES: ApplicationStatus[] = ["applied", "applied_externally"];

/**
 * POST /api/applications
 *
 * Creates a new job application for the authenticated user.
 * Supports both internal applications (status: 'applied') and
 * external application confirmations (status: 'applied_externally').
 *
 * The authenticated user IS the applicant.
 *
 * Request body:
 * - jobDescriptionId: string (required) — UUID of the job to apply to
 * - status: 'applied' | 'applied_externally' (optional, defaults to 'applied')
 *
 * Responses:
 * - 201: Application created successfully
 * - 400: Invalid request body or status
 * - 401: User is not authenticated
 * - 409: User has already applied to this job (duplicate)
 * - 422: Job is not published or not found
 * - 503: Applications table not yet created
 * - 500: Unexpected server error
 *
 * Requirements: 20.2, 20.3, 20.4
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate the user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { success: false, error: "unauthenticated", message: "You must be logged in to apply." },
      { status: 401 }
    );
  }

  // 2. Parse and validate request body
  let body: { jobDescriptionId?: string; job_description_id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "invalid_body", message: "Invalid request body." },
      { status: 400 }
    );
  }

  // Accept both camelCase and snake_case for job description ID
  const jobDescriptionId = body.jobDescriptionId || body.job_description_id;

  if (!jobDescriptionId || typeof jobDescriptionId !== "string") {
    return Response.json(
      { success: false, error: "invalid_body", message: "jobDescriptionId is required and must be a string." },
      { status: 400 }
    );
  }

  // Validate status if provided (defaults to 'applied')
  const status: ApplicationStatus = (body.status as ApplicationStatus) || "applied";

  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      {
        success: false,
        error: "invalid_status",
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // 3. Create the application via the service layer
  try {
    const application = await createApplication(user.id, jobDescriptionId, status);

    return Response.json(
      { success: true, application },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    if (message === "Job is not published" || message === "Job not found") {
      return Response.json(
        { success: false, error: "job_not_published", message },
        { status: 422 }
      );
    }

    if (message === "You have already applied to this job") {
      return Response.json(
        { success: false, error: "already_applied", message },
        { status: 409 }
      );
    }

    // Table does not exist — guide the user to run the migration
    if (message.includes("relation") || message.includes("does not exist")) {
      return Response.json(
        {
          success: false,
          error: "table_not_found",
          message: "The applications table has not been created yet. Please run the migration.",
        },
        { status: 503 }
      );
    }

    return Response.json(
      { success: false, error: "internal_error", message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
