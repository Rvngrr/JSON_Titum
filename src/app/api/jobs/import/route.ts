import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { importJobs } from "@/lib/import/import-service";
import type { ImportOptions, ImportResult } from "@/lib/import/types";

/**
 * POST /api/jobs/import
 *
 * Triggers a job import from the external JSearch/Indeed API.
 *
 * Authentication: Requires a valid Supabase session with the `hr_user` role.
 * - 401: Unauthenticated (no valid session)
 * - 403: Unauthorized (user is not hr_user)
 *
 * Request body (all optional):
 * - query: string (default: "software developer")
 * - location: string (default: "Philippines")
 * - forceRefresh: boolean (default: false)
 *
 * Responses:
 * - 200: Import completed (may include warnings array if LLM was unavailable)
 * - 400: Invalid request body
 * - 429: API rate limit exhausted
 * - 500: Internal server error
 * - 502: External API error
 * - 504: External API timeout
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate the caller
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // 2. Verify the caller has the hr_user role
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: "Unable to verify user role." },
      { status: 500 }
    );
  }

  if (profile.role !== "hr_user") {
    return NextResponse.json(
      { success: false, error: "Forbidden. Only HR users can trigger job imports." },
      { status: 403 }
    );
  }

  // 3. Parse optional request body parameters
  let query = "software developer";
  let location = "Philippines";
  let forceRefresh = false;

  try {
    const body = await request.json();

    if (body.query !== undefined) {
      if (typeof body.query !== "string" || body.query.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Invalid 'query' parameter. Must be a non-empty string." },
          { status: 400 }
        );
      }
      query = body.query.trim();
    }

    if (body.location !== undefined) {
      if (typeof body.location !== "string" || body.location.trim() === "") {
        return NextResponse.json(
          { success: false, error: "Invalid 'location' parameter. Must be a non-empty string." },
          { status: 400 }
        );
      }
      location = body.location.trim();
    }

    if (body.forceRefresh !== undefined) {
      if (typeof body.forceRefresh !== "boolean") {
        return NextResponse.json(
          { success: false, error: "Invalid 'forceRefresh' parameter. Must be a boolean." },
          { status: 400 }
        );
      }
      forceRefresh = body.forceRefresh;
    }
  } catch {
    // Empty body is fine — use defaults
  }

  // 4. Call the import service
  const importOptions: ImportOptions = {
    query,
    location,
    forceRefresh,
    apiSource: "jsearch",
    hrUserId: user.id,
  };

  let result: ImportResult;

  try {
    result = await importJobs(importOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";

    // Classify the error into appropriate HTTP status codes
    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { success: false, error: "External API request timed out. Please try again later." },
        { status: 504 }
      );
    }

    if (
      message.toLowerCase().includes("external api") ||
      message.toLowerCase().includes("network") ||
      message.toLowerCase().includes("econnrefused") ||
      message.toLowerCase().includes("fetch failed")
    ) {
      return NextResponse.json(
        { success: false, error: `External API error: ${message}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }

  // 5. Handle import result
  if (!result.success) {
    // Determine the appropriate error status code from the error message
    if (result.error?.includes("quota exhausted")) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warnings: result.warnings,
        },
        { status: 429 }
      );
    }

    if (result.error?.includes("Configuration error")) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }

    // External API errors from the service
    if (
      result.error?.toLowerCase().includes("timeout")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warnings: result.warnings,
        },
        { status: 504 }
      );
    }

    if (
      result.error?.toLowerCase().includes("api") ||
      result.error?.toLowerCase().includes("external")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warnings: result.warnings,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        warnings: result.warnings,
      },
      { status: 500 }
    );
  }

  // 6. Success response — 200 with import counts, cache status, and warnings
  return NextResponse.json(
    {
      success: true,
      importedCount: result.importedCount,
      skippedDuplicates: result.skippedDuplicates,
      cacheUsed: result.cacheUsed,
      cacheTimestamp: result.cacheTimestamp,
      warnings: result.warnings,
    },
    { status: 200 }
  );
}
