import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/resume/view?applicant_id=xxx
 * 
 * Generates a signed URL for viewing an applicant's resume.
 * - Applicants can view their own resume
 * - HR users can view any applicant's resume (for ranking/review)
 * 
 * Uses the admin client to generate signed URLs (bypasses storage RLS).
 * The signed URL expires after 5 minutes for security.
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get applicant_id from query params
    const url = new URL(request.url);
    const applicantId = url.searchParams.get("applicant_id");

    if (!applicantId) {
      return NextResponse.json({ error: "applicant_id is required" }, { status: 400 });
    }

    // 3. Authorization check
    const adminClient = createAdminClient();
    
    // Get the requesting user's profile to check their role
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    // Applicants can only view their own resume
    if (profile.role === "applicant" && applicantId !== user.id) {
      return NextResponse.json({ error: "You can only view your own resume" }, { status: 403 });
    }

    // HR users can view any applicant's resume (no restriction needed)

    // 4. Get the resume file path from skill_profiles
    const { data: skillProfile } = await adminClient
      .from("skill_profiles")
      .select("resume_file_path")
      .eq("user_id", applicantId)
      .single();

    if (!skillProfile?.resume_file_path) {
      return NextResponse.json({ error: "No resume uploaded for this applicant" }, { status: 404 });
    }

    // 5. Generate a signed URL (5 minute expiry)
    const { data: signedData, error: signError } = await adminClient.storage
      .from("resumes")
      .createSignedUrl(skillProfile.resume_file_path, 300);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate resume link" }, { status: 500 });
    }

    // 6. Return the signed URL
    return NextResponse.json({ url: signedData.signedUrl });
  } catch (error) {
    console.error("[resume/view] Error:", error);
    return NextResponse.json({ error: "Failed to retrieve resume" }, { status: 500 });
  }
}
