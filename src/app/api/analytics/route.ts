import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAnalyticsData, formatAsCSV } from "@/lib/analytics/analytics-service";

/**
 * GET /api/analytics
 *
 * Returns aggregated platform analytics metrics for HR users.
 *
 * Authentication: Requires a valid Supabase session with the `hr_user` role.
 * - 401: Unauthenticated (no valid session)
 * - 403: Unauthorized (user is not hr_user)
 *
 * Query parameters:
 * - format: "csv" to return data as text/csv for export (optional)
 *
 * Responses:
 * - 200: Analytics data (JSON or CSV depending on format param)
 * - 401: Not authenticated
 * - 403: Not authorized (not hr_user role)
 * - 500: Internal server error
 *
 * Requirements: 24.1, 24.8
 */
export async function GET(request: NextRequest) {
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
      { success: false, error: "Forbidden. Only HR users can access analytics." },
      { status: 403 }
    );
  }

  // 3. Fetch analytics data
  let analyticsData;
  try {
    analyticsData = await getAnalyticsData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: `Failed to retrieve analytics: ${message}` },
      { status: 500 }
    );
  }

  // 4. Check for CSV export format
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const csv = formatAsCSV(analyticsData);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=\"analytics-export.csv\"",
      },
    });
  }

  // 5. Return JSON response
  return NextResponse.json(
    {
      success: true,
      data: analyticsData,
    },
    { status: 200 }
  );
}
