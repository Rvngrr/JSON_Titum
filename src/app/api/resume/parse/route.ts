import { createAdminClient } from "@/lib/supabase/server";
import { ResumeParseResponse, ResumeProfile } from "@/types";
import { parseResume } from "@/lib/resume-parser";
import type { StructuredProfile } from "@/lib/resume-parser";

/**
 * POST /api/resume/parse
 *
 * Downloads a resume file from Supabase Storage, extracts text,
 * uses the local-first parseResume orchestrator to extract structured data,
 * and persists results to skill_profiles and skills tables.
 *
 * Request body: { file_path: string, user_id: string }
 * Response: ResumeParseResponse
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { file_path, user_id } = body;

    if (!file_path || !user_id) {
      return Response.json(
        {
          success: false,
          skills: [],
          error: "Missing required fields: file_path and user_id",
        } satisfies ResumeParseResponse,
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Download the file from Supabase Storage
    console.log("[resume/parse] Downloading file from path:", file_path);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("[resume/parse] Download failed:", downloadError);
      return Response.json(
        {
          success: false,
          skills: [],
          error: `Failed to download resume file: ${downloadError?.message ?? "File not found"}`,
        } satisfies ResumeParseResponse,
        { status: 404 }
      );
    }

    // 2. Extract text from the file
    let rawText: string;
    try {
      rawText = await extractTextFromFile(fileData, file_path);
    } catch (extractError) {
      console.error("[resume/parse] Text extraction failed:", extractError);
      return Response.json(
        {
          success: false,
          skills: [],
          error: "Failed to extract text from the uploaded file. Please try a different format or enter skills manually.",
        } satisfies ResumeParseResponse,
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length === 0) {
      return Response.json(
        {
          success: false,
          skills: [],
          error:
            "Could not extract text from the uploaded file. Please try a different file or enter skills manually.",
        } satisfies ResumeParseResponse,
        { status: 422 }
      );
    }

    // 3. Parse resume using local-first orchestrator with optional AI enhancement
    console.log("[resume/parse] Step 3: Parsing resume with orchestrator, text length:", rawText.length);
    let structuredProfile: StructuredProfile;
    try {
      structuredProfile = await parseResume(rawText, { enableEnhancement: true });
    } catch (parseError) {
      console.error("[resume/parse] parseResume orchestrator failed:", parseError);
      return Response.json(
        {
          success: false,
          skills: [],
          error: "Failed to parse resume content. Please try again.",
        } satisfies ResumeParseResponse,
        { status: 500 }
      );
    }
    console.log("[resume/parse] Step 3 done: Extracted", structuredProfile.skills.length, "skills,", structuredProfile.experience.length, "experiences");

    // 3a. Convert StructuredProfile skills to response format
    const extractedSkills = structuredProfile.skills.map((skill) => ({
      name: skill.name,
      proficiency_level: skill.proficiencyLevel,
    }));

    // 3b. Convert StructuredProfile to ResumeProfile for backward compatibility
    const resumeProfile: ResumeProfile = mapToResumeProfile(structuredProfile);

    // 4. Upsert skill_profile record for the user — include structured profile data
    console.log("[resume/parse] Step 4: Upserting skill_profile for user:", user_id);

    // Convert extracted profile into the database format
    const workExperience = structuredProfile.experience.map((exp, idx) => ({
      id: `resume-exp-${idx}`,
      title: exp.title,
      company: exp.company,
      industry: '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      isCurrent: exp.isCurrent,
      description: exp.highlights.join('\n'),
    }));

    const education = structuredProfile.education.map((edu, idx) => ({
      id: `resume-edu-${idx}`,
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy || '',
      graduationYear: edu.graduationYear || '',
    }));

    const certifications = structuredProfile.certifications.map((cert, idx) => ({
      id: `resume-cert-${idx}`,
      name: cert.name,
      issuer: cert.issuer || '',
      date: cert.date || '',
    }));

    const { data: skillProfile, error: upsertError } = await supabase
      .from("skill_profiles")
      .upsert(
        {
          user_id,
          resume_file_path: file_path,
          raw_resume_text: rawText,
          work_experience: workExperience.length > 0 ? workExperience : undefined,
          education: education.length > 0 ? education : undefined,
          certifications: certifications.length > 0 ? certifications : undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (upsertError || !skillProfile) {
      console.error("[resume/parse] Step 4 failed:", upsertError);

      // Provide specific guidance about which column is missing
      let errorDetail = upsertError?.message ?? "Unknown error";
      if (errorDetail.includes("column") && errorDetail.includes("schema cache")) {
        const columnMatch = errorDetail.match(/'(\w+)' column/);
        const missingColumn = columnMatch ? columnMatch[1] : "unknown";
        errorDetail = `Database column '${missingColumn}' not found. Please run the latest migration (014_add_profile_jsonb_columns.sql) in your Supabase SQL Editor.`;
      }

      return Response.json(
        {
          success: false,
          skills: [],
          error: `Failed to save skill profile: ${errorDetail}`,
        } satisfies ResumeParseResponse,
        { status: 500 }
      );
    }

    // 5. Remove previous resume-parsed skills before inserting new ones
    await supabase
      .from("skills")
      .delete()
      .eq("skill_profile_id", skillProfile.id)
      .eq("source", "resume_parsed");

    // 6. Insert extracted skills into the skills table
    if (extractedSkills.length > 0) {
      const skillRows = extractedSkills.map((skill) => ({
        skill_profile_id: skillProfile.id,
        name: skill.name,
        proficiency_level: skill.proficiency_level,
        source: "resume_parsed" as const,
      }));

      const { error: insertError } = await supabase
        .from("skills")
        .insert(skillRows);

      if (insertError) {
        return Response.json(
          {
            success: false,
            skills: [],
            error: `Failed to save extracted skills: ${insertError.message}`,
          } satisfies ResumeParseResponse,
          { status: 500 }
        );
      }
    }

    // 7. Trigger match calculation for this applicant against all published jobs
    try {
      const { data: publishedJobs } = await supabase
        .from("job_descriptions")
        .select("id")
        .eq("status", "published");

      if (publishedJobs && publishedJobs.length > 0) {
        const { calculateMatch } = await import("@/lib/ai/match-engine");

        for (const job of publishedJobs) {
          try {
            const { data: jobSkills } = await supabase
              .from("job_required_skills")
              .select("*")
              .eq("job_description_id", job.id);

            const { data: applicantSkills } = await supabase
              .from("skills")
              .select("*")
              .eq("skill_profile_id", skillProfile.id);

            if (jobSkills && jobSkills.length > 0 && applicantSkills && applicantSkills.length > 0) {
              const result = await calculateMatch(applicantSkills, jobSkills);

              await supabase
                .from("match_results")
                .upsert(
                  {
                    applicant_id: user_id,
                    job_description_id: job.id,
                    match_percentage: result.matchPercentage,
                    matched_skills: result.matchedSkills,
                    missing_skills: result.missingSkills,
                    calculated_at: new Date().toISOString(),
                  },
                  { onConflict: "applicant_id,job_description_id" }
                );
            }
          } catch (matchErr) {
            console.error(`[resume/parse] Match calc failed for job ${job.id}:`, matchErr);
          }
        }
      }
    } catch (matchError) {
      // Non-fatal: match calculation can be triggered separately
      console.error("[resume/parse] Match calculation failed:", matchError);
    }

    // 8. Build section warnings for sections that had no data extracted
    const sectionWarnings: string[] = [];
    if (extractedSkills.length === 0) {
      sectionWarnings.push("Skills: No skills detected from your resume.");
    }
    if (structuredProfile.experience.length === 0) {
      sectionWarnings.push("Work Experience: No work experience entries detected.");
    }
    if (structuredProfile.education.length === 0) {
      sectionWarnings.push("Education: No education entries detected.");
    }
    if (structuredProfile.certifications.length === 0) {
      sectionWarnings.push("Certifications: No certifications detected.");
    }

    // 9. Return the parsed response with warnings
    return Response.json({
      success: true,
      skills: extractedSkills,
      profile: resumeProfile,
      raw_text: rawText,
      warnings: sectionWarnings.length > 0 ? sectionWarnings : undefined,
    });
  } catch (error) {
    console.error("[resume/parse] Error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return Response.json(
      {
        success: false,
        skills: [],
        error: `Resume parsing failed: ${message}`,
      } satisfies ResumeParseResponse,
      { status: 500 }
    );
  }
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

/**
 * Maps a StructuredProfile from the orchestrator to the existing ResumeProfile
 * response shape for backward compatibility.
 */
function mapToResumeProfile(profile: StructuredProfile): ResumeProfile {
  return {
    experience: profile.experience.map((exp) => ({
      title: exp.title,
      organization: exp.company,
      duration: formatDuration(exp.startDate, exp.endDate, exp.isCurrent),
      highlights: exp.highlights,
    })),
    projects: profile.projects.map((proj) => ({
      name: proj.name,
      description: proj.description,
      technologies: proj.technologies,
      outcome: proj.outcome ?? undefined,
    })),
    certifications: profile.certifications.map((cert) => cert.name),
    achievements: profile.achievements,
    education: profile.education.map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      year: edu.graduationYear,
    })),
  };
}

/**
 * Formats start/end dates into a human-readable duration string.
 * E.g. "2020 - 2022" or "2021 - Present"
 */
function formatDuration(startDate: string, endDate: string, isCurrent: boolean): string {
  if (isCurrent) {
    return startDate ? `${startDate} - Present` : 'Present';
  }
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }
  if (startDate) {
    return startDate;
  }
  if (endDate) {
    return endDate;
  }
  return '';
}

// ─── File Extraction Utilities ──────────────────────────────────────────────

/**
 * Extracts text content from a file blob.
 * Supports PDF (basic binary-to-text extraction) and DOCX (XML parsing).
 */
async function extractTextFromFile(
  fileBlob: Blob,
  filePath: string
): Promise<string> {
  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".pdf")) {
    return extractTextFromPDF(buffer);
  } else if (lowerPath.endsWith(".docx")) {
    return extractTextFromDOCX(buffer);
  }

  // Fallback: attempt to read as plain text
  return buffer.toString("utf-8");
}

/**
 * Basic PDF text extraction using pdf-parse library.
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdf = (await import("pdf-parse")).default;
    const data = await pdf(buffer);
    return data.text?.trim() ?? "";
  } catch (error) {
    console.error("PDF parse error:", error);
    // Fallback: extract printable character sequences from binary
    const content = buffer.toString("latin1");
    const printableRegex = /[\x20-\x7E]{4,}/g;
    const segments: string[] = [];
    let match;
    while ((match = printableRegex.exec(content)) !== null) {
      segments.push(match[0]);
    }
    return segments.join(" ").trim();
  }
}

/**
 * Basic DOCX text extraction.
 * DOCX files are ZIP archives containing XML. This extracts text from
 * the word/document.xml file within the archive.
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  // DOCX is a ZIP file. We look for the PK signature and parse the XML content.
  // A minimal approach: find XML text content between <w:t> tags
  const content = buffer.toString("utf-8");

  // Extract text from <w:t> elements (Word text runs)
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const textSegments: string[] = [];
  let match;

  while ((match = textRegex.exec(content)) !== null) {
    if (match[1]) {
      textSegments.push(match[1]);
    }
  }

  if (textSegments.length > 0) {
    return textSegments.join(" ").trim();
  }

  // Fallback: strip all XML tags and return remaining text
  const stripped = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  // Filter to only meaningful content (at least some alphabetic characters)
  if (/[a-zA-Z]{3,}/.test(stripped)) {
    return stripped;
  }

  return "";
}
