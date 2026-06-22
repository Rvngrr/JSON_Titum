import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { detectSections, getSectionContent } from "@/lib/resume-parser/section-detector";
import { extractSkills } from "@/lib/resume-parser/skills-extractor";

/**
 * GET /api/resume/debug
 * 
 * Debug endpoint that shows what the PDF text extraction and section detection
 * produce for the current user's resume. Remove after debugging.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get the user's resume file path
  const { data: profile } = await adminClient
    .from("skill_profiles")
    .select("resume_file_path, raw_resume_text")
    .eq("user_id", user.id)
    .single();

  if (!profile?.resume_file_path) {
    return NextResponse.json({ error: "No resume uploaded" }, { status: 404 });
  }

  // Download and extract text
  const { data: fileData } = await adminClient.storage
    .from("resumes")
    .download(profile.resume_file_path);

  if (!fileData) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  // Try unpdf extraction
  let extractedText = "";
  try {
    const { extractText } = await import("unpdf");
    const result = await extractText(new Uint8Array(buffer));
    extractedText = result.text?.trim() ?? "";
  } catch (e) {
    extractedText = `unpdf failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  // If unpdf failed, try pdf-parse
  if (extractedText.startsWith("unpdf failed") || extractedText.length < 50) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer, { max: 0 });
      const pdfText = data.text?.trim() ?? "";
      if (pdfText.length > extractedText.length) {
        extractedText = pdfText;
      }
    } catch (e) {
      extractedText += ` | pdf-parse also failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  // Run section detection
  const sectionResult = detectSections(extractedText);
  const skillsLines = getSectionContent(sectionResult, 'skills');
  const experienceLines = getSectionContent(sectionResult, 'experience');
  const educationLines = getSectionContent(sectionResult, 'education');
  const projectLines = getSectionContent(sectionResult, 'projects');
  const certificationLines = getSectionContent(sectionResult, 'certifications');

  // Run skills extraction
  const skills = extractSkills({ skillsLines, certificationLines, experienceLines, projectLines });

  return NextResponse.json({
    extractedTextLength: extractedText.length,
    extractedTextPreview: extractedText.substring(0, 1000),
    rawResumeTextFromDB: profile.raw_resume_text?.substring(0, 500) ?? null,
    sections: {
      detected: sectionResult.sections.map(s => ({ type: s.type, startLine: s.startLine })),
      hasStructure: sectionResult.hasStructure,
      skillsLines: skillsLines.slice(0, 20),
      experienceLines: experienceLines.slice(0, 10),
      educationLines: educationLines.slice(0, 10),
      projectLines: projectLines.slice(0, 10),
    },
    extractedSkills: skills.map(s => ({ name: s.name, raw: s.rawName, proficiency: s.proficiencyLevel })),
    skillsCount: skills.length,
  });
}
