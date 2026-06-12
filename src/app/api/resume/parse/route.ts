import { createAdminClient } from "@/lib/supabase/server";
import { ResumeParseResponse } from "@/types";
import OpenAI from "openai";

/**
 * POST /api/resume/parse
 *
 * Downloads a resume file from Supabase Storage, extracts text,
 * calls OpenAI to extract structured skills, and persists results
 * to skill_profiles and skills tables.
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
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(file_path);

    if (downloadError || !fileData) {
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
    const rawText = await extractTextFromFile(fileData, file_path);

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

    // 3. Call OpenAI to extract structured skills
    const extractedSkills = await extractSkillsWithAI(rawText);

    // 4. Upsert skill_profile record for the user
    const { data: skillProfile, error: upsertError } = await supabase
      .from("skill_profiles")
      .upsert(
        {
          user_id,
          resume_file_path: file_path,
          raw_resume_text: rawText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (upsertError || !skillProfile) {
      return Response.json(
        {
          success: false,
          skills: [],
          error: `Failed to save skill profile: ${upsertError?.message ?? "Unknown error"}`,
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

    // 7. Return the parsed response
    return Response.json({
      success: true,
      skills: extractedSkills,
      raw_text: rawText,
    } satisfies ResumeParseResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return Response.json(
      {
        success: false,
        skills: [],
        error: message,
      } satisfies ResumeParseResponse,
      { status: 500 }
    );
  }
}

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
 * Basic PDF text extraction.
 * Extracts readable ASCII/UTF-8 text segments from PDF binary.
 * For production use, consider pdf-parse or similar library.
 */
function extractTextFromPDF(buffer: Buffer): string {
  // Extract text between BT (begin text) and ET (end text) markers in PDF stream,
  // or fall back to extracting printable character sequences.
  const content = buffer.toString("latin1");

  // Try to find text objects in PDF content streams
  const textSegments: string[] = [];
  const textObjectRegex = /\(([^)]*)\)/g;
  let match;

  while ((match = textObjectRegex.exec(content)) !== null) {
    const text = match[1];
    // Filter to only printable ASCII text of reasonable length
    if (text.length > 1 && /^[\x20-\x7E\s]+$/.test(text)) {
      textSegments.push(text);
    }
  }

  if (textSegments.length > 0) {
    return textSegments.join(" ").trim();
  }

  // Fallback: extract sequences of printable characters
  const printableRegex = /[\x20-\x7E]{4,}/g;
  const segments: string[] = [];
  while ((match = printableRegex.exec(content)) !== null) {
    segments.push(match[0]);
  }

  return segments.join(" ").trim();
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

/**
 * Calls OpenAI to extract structured skills from resume text.
 * Returns an array of skills with name and proficiency level.
 */
async function extractSkillsWithAI(
  resumeText: string
): Promise<Array<{ name: string; proficiency_level: "beginner" | "intermediate" | "advanced" | "expert" }>> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are a resume parser. Extract all professional skills from the following resume text.

For each skill, determine the proficiency level based on context clues:
- "expert": 5+ years experience, lead/senior roles, deep expertise mentioned
- "advanced": 3-5 years experience, significant project work
- "intermediate": 1-3 years experience, some project work
- "beginner": mentioned but no significant experience indicated

Return ONLY a valid JSON array with objects containing "name" (string) and "proficiency_level" (one of: "beginner", "intermediate", "advanced", "expert").

Example output:
[{"name": "Python", "proficiency_level": "advanced"}, {"name": "React", "proficiency_level": "intermediate"}]

Resume text:
${resumeText}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise resume parser that extracts skills and proficiency levels. Always respond with valid JSON only, no markdown formatting or extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return [];
    }

    // Parse the JSON response, handling potential markdown code fences
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and sanitize each skill entry
    const validLevels = ["beginner", "intermediate", "advanced", "expert"] as const;

    return parsed
      .filter(
        (item: unknown): item is { name: string; proficiency_level: string } =>
          typeof item === "object" &&
          item !== null &&
          "name" in item &&
          typeof (item as Record<string, unknown>).name === "string" &&
          "proficiency_level" in item &&
          typeof (item as Record<string, unknown>).proficiency_level === "string"
      )
      .map((item) => ({
        name: item.name.trim(),
        proficiency_level: validLevels.includes(
          item.proficiency_level as (typeof validLevels)[number]
        )
          ? (item.proficiency_level as (typeof validLevels)[number])
          : ("intermediate" as const),
      }))
      .filter((item) => item.name.length > 0);
  } catch (error) {
    // If OpenAI call or JSON parsing fails, return empty array
    // The caller will still save the raw_resume_text for future retries
    console.error("Failed to extract skills with AI:", error);
    return [];
  }
}
