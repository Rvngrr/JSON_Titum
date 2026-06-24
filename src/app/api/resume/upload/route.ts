import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/resume/upload
 * 
 * Handles resume file upload using the admin client to bypass storage RLS.
 * Authenticates the user first, then uploads the file to their folder.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // If token is invalid/expired, try refreshing the session first
      if (authError?.message?.includes("JWS") || authError?.message?.includes("token")) {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !session?.user) {
          return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
        }
        // Use the refreshed user
        return handleUpload(request, session.user.id);
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handleUpload(request, user.id);
  } catch (error) {
    console.error("[resume/upload] Error:", error);
    return NextResponse.json({ error: "Upload failed unexpectedly" }, { status: 500 });
  }
}

async function handleUpload(request: Request, userId: string) {
  // 2. Get the file from the form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 3. Validate file type and size
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Only PDF and DOCX allowed." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });
  }

  // 4. Delete previous resume files to save storage
  const adminClient = createAdminClient();
  const { data: existingFiles } = await adminClient.storage
    .from("resumes")
    .list(userId);

  if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
    await adminClient.storage.from("resumes").remove(filesToDelete);
  }

  // 5. Upload new file using admin client (bypasses RLS)
  const filePath = `${userId}/${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from("resumes")
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("[resume/upload] Upload error:", uploadError);
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // 6. Return success with file path
  return NextResponse.json({
    success: true,
    file_path: filePath,
    user_id: userId,
  });
}
