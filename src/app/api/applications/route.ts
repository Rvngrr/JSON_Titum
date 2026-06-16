import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApplication } from "@/lib/applications/service";

/**
 * POST /api/applications
 *
 * Creates a new job application for the authenticated user.
 * Validates authentication, request body, and job status before
 * delegating to the ApplicationService.
 *
 * Responses:
 * - 201: Application created successfully
 * - 401: User is not authenticated
 * - 422: Job is not published or not found
 * - 409: User has already applied to this job
 * - 500: Unexpected server error
 */
export async function POST(request: NextRequest) {
  // Authenticate the user
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

  // Parse and validate request body
  let body: { job_description_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "invalid_body", message: "Invalid request body." },
      { status: 400 }
    );
  }

  const { job_description_id } = body;

  if (!job_description_id || typeof job_description_id !== "string") {
    return Response.json(
      { success: false, error: "invalid_body", message: "job_description_id is required." },
      { status: 400 }
    );
  }

  // Create the application via the service layer
  try {
    const application = await createApplication(user.id, job_description_id);

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
