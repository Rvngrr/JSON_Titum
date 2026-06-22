import { createAdminClient } from "@/lib/supabase/server";
import { ResumeParseResponse, ResumeProfile } from "@/types";
import { callGemini } from "@/lib/ai/gemini";

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

    // 3. Call AI to extract structured skills and profile
    console.log("[resume/parse] Step 3: Calling AI to extract skills, text length:", rawText.length);
    let extractedSkills = await extractSkillsWithAI(rawText);
    
    // 3a. If AI failed (quota/error), fall back to local text extraction
    if (extractedSkills.length === 0) {
      console.log("[resume/parse] AI extraction returned 0 skills, using local fallback");
      extractedSkills = extractSkillsLocally(rawText);
      console.log("[resume/parse] Local extraction found", extractedSkills.length, "skills");
    } else {
      console.log("[resume/parse] Step 3 done: Extracted", extractedSkills.length, "skills");
    }

    // 3b. Extract full profile (projects, experience, certs, achievements)
    console.log("[resume/parse] Step 3b: Extracting structured profile...");
    let resumeProfile = await extractResumeProfile(rawText);
    console.log("[resume/parse] Step 3b done:", resumeProfile.projects.length, "projects,", resumeProfile.experience.length, "experiences");

    // 3c. If AI returned empty profile, use local fallback parser
    if (resumeProfile.experience.length === 0 && resumeProfile.education.length === 0) {
      console.log("[resume/parse] Step 3c: AI profile empty, using local fallback parser...");
      const localProfile = extractProfileLocally(rawText);
      if (localProfile.experience.length > 0) resumeProfile.experience = localProfile.experience;
      if (localProfile.education.length > 0) resumeProfile.education = localProfile.education;
      if (localProfile.certifications.length > 0) resumeProfile.certifications = localProfile.certifications;
      if (localProfile.projects.length > 0) resumeProfile.projects = localProfile.projects;
      if (localProfile.achievements.length > 0) resumeProfile.achievements = localProfile.achievements;
      console.log("[resume/parse] Step 3c done: local fallback found", localProfile.education.length, "education,", localProfile.experience.length, "experience,", localProfile.certifications.length, "certifications");
    }

    // 4. Upsert skill_profile record for the user — include structured profile data
    console.log("[resume/parse] Step 4: Upserting skill_profile for user:", user_id);

    // Convert extracted profile into the database format
    const workExperience = resumeProfile.experience.map((exp, idx) => ({
      id: `resume-exp-${idx}`,
      title: exp.title,
      company: exp.organization,
      industry: '',
      startDate: exp.duration.split(' - ')[0]?.trim() || '',
      endDate: exp.duration.split(' - ')[1]?.trim() || '',
      isCurrent: exp.duration.toLowerCase().includes('present'),
      description: exp.highlights.join('\n'),
    }));

    const education = resumeProfile.education.map((edu, idx) => ({
      id: `resume-edu-${idx}`,
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: '',
      graduationYear: edu.year,
    }));

    const certifications = resumeProfile.certifications.map((cert, idx) => ({
      id: `resume-cert-${idx}`,
      name: cert,
      issuer: '',
      date: '',
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

    // 8. Return the parsed response
    return Response.json({
      success: true,
      skills: extractedSkills,
      profile: resumeProfile,
      raw_text: rawText,
    } satisfies ResumeParseResponse);
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

/**
 * Calls Gemini to extract structured skills from resume text.
 * Uses an enhanced prompt for better accuracy in skill detection and proficiency assessment.
 * Returns an array of skills with name and proficiency level.
 */
async function extractSkillsWithAI(
  resumeText: string
): Promise<Array<{ name: string; proficiency_level: "beginner" | "intermediate" | "advanced" | "expert" }>> {
  const systemPrompt = `You are an expert technical recruiter and resume analyst. Your job is to extract ALL technical and professional skills from resumes with high precision.

RULES:
1. Extract EVERY skill mentioned — programming languages, frameworks, libraries, tools, methodologies, soft skills, platforms, and certifications.
2. Use the CANONICAL name for each skill (e.g., "React" not "ReactJS", "JavaScript" not "JS", "Next.js" not "NextJS").
3. Do NOT merge related but distinct skills (e.g., "HTML" and "CSS" are separate skills, "Python" and "Flask" are separate).
4. Do NOT invent skills that are not mentioned or strongly implied.
5. Include soft skills if explicitly stated (e.g., "Team Collaboration", "Problem-Solving").
6. Always respond with valid JSON only — no markdown, no explanation, no extra text.`;

  const userPrompt = `Extract all professional skills from this resume. Be thorough — do not miss any skill mentioned in the text.

PROFICIENCY ASSESSMENT RULES:
- "expert": The person led teams/projects using this skill, has 5+ years with it, or is explicitly described as expert/senior level
- "advanced": The person built significant projects with this skill, used it professionally for 2-4 years, or demonstrated strong results (e.g., "improved performance by 25%")
- "intermediate": The person used this skill in projects, coursework, or 1-2 years of experience, or it's listed in their skills section with demonstrated use
- "beginner": The skill is only listed without evidence of use, mentioned in passing, or associated with certifications/seminars only

SKILL CATEGORIES TO LOOK FOR:
- Programming languages (C++, Python, Java, JavaScript, etc.)
- Frontend frameworks/libraries (React, Next.js, Vue, Angular, Tailwind CSS, etc.)
- Backend frameworks (Flask, Django, Spring Boot, Node.js, Express, etc.)
- AI/ML tools (TensorFlow, PyTorch, OpenAI, YOLO, Scikit Learn, etc.)
- Databases (SQL, PostgreSQL, MongoDB, etc.)
- DevOps/Cloud (Docker, AWS, CI/CD, Git, etc.)
- Design tools (Figma, Canva, Adobe XD, etc.)
- Testing (Manual Testing, Unit Testing, Cross-Browser Testing, etc.)
- Soft skills (Leadership, Communication, Problem-Solving, Team Collaboration, etc.)
- Other tools (Excel, Google Suite, Microsoft Office, etc.)

Return a JSON array. Example:
[
  {"name": "Python", "proficiency_level": "advanced"},
  {"name": "React", "proficiency_level": "intermediate"},
  {"name": "Figma", "proficiency_level": "intermediate"},
  {"name": "Team Collaboration", "proficiency_level": "advanced"}
]

RESUME TEXT:
---
${resumeText}
---

Extract ALL skills now. Be comprehensive.`;

  try {
    const content = await callGemini(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 3000 });

    // Parse the JSON response
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and sanitize each skill entry
    const validLevels = ["beginner", "intermediate", "advanced", "expert"] as const;

    // Deduplicate by normalized skill name
    const seen = new Set<string>();

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
      .filter((item) => {
        if (item.name.length === 0) return false;
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (error) {
    console.error("Failed to extract skills with AI:", error);
    return [];
  }
}


/**
 * Extracts a full structured profile from resume text using Gemini.
 * Captures experience, projects (with tech & outcomes), certifications, and achievements.
 */
async function extractResumeProfile(resumeText: string): Promise<ResumeProfile> {
  const systemPrompt = `You are an expert resume analyst. Extract structured information from resumes with high accuracy. Always respond with valid JSON only.`;

  const userPrompt = `Analyze this resume and extract the following structured data.

IMPORTANT RULES:
- For EXPERIENCE: extract job title, organization, duration (e.g., "2024 - 2025"), and 2-4 bullet-point highlights showing what they accomplished
- For PROJECTS: extract project name, a one-line description, technologies used (as array), and the measurable outcome/result if mentioned
- For CERTIFICATIONS: list all certifications, seminars, and training programs
- For ACHIEVEMENTS: list awards, rankings (e.g., "6th Place in Hawk-a-thon"), metrics (e.g., "improved performance by 25%"), and notable accomplishments
- For EDUCATION: extract degree, institution, and graduation year

Return a JSON object with this EXACT structure:
{
  "experience": [
    {
      "title": "Job Title",
      "organization": "Company/Org Name",
      "duration": "Start - End",
      "highlights": ["What they did 1", "What they did 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "One-line description of what it does",
      "technologies": ["Tech1", "Tech2"],
      "outcome": "Measurable result if mentioned (e.g., '90% accuracy', '25% improvement')"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "achievements": ["Achievement 1", "Achievement 2"],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "year": "2026"
    }
  ]
}

RESUME TEXT:
---
${resumeText}
---`;

  try {
    const content = await callGemini(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 3000 });
    const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    // Validate and return with defaults for missing fields
    return {
      experience: Array.isArray(parsed.experience) ? parsed.experience.map((e: Record<string, unknown>) => ({
        title: String(e.title || ""),
        organization: String(e.organization || ""),
        duration: String(e.duration || ""),
        highlights: Array.isArray(e.highlights) ? e.highlights.map(String) : [],
      })) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map((p: Record<string, unknown>) => ({
        name: String(p.name || ""),
        description: String(p.description || ""),
        technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : [],
        outcome: p.outcome ? String(p.outcome) : undefined,
      })) : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications.map(String) : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.map(String) : [],
      education: Array.isArray(parsed.education) ? parsed.education.map((ed: Record<string, unknown>) => ({
        degree: String(ed.degree || ""),
        institution: String(ed.institution || ""),
        year: String(ed.year || ""),
      })) : [],
    };
  } catch (error) {
    console.error("[resume/parse] Profile extraction failed:", error);
    // Return empty profile on failure — skills are still available
    return {
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
      education: [],
    };
  }
}


/**
 * Local fallback: Extracts a structured profile (education, experience, certifications)
 * from resume text by detecting section headers and parsing entries within each section.
 * Used when AI extraction returns empty results.
 */
function extractProfileLocally(rawText: string): ResumeProfile {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect section boundaries by common headings
  const sectionIndices: Array<{ type: string; startIdx: number }> = [];
  const headerPatterns: Record<string, RegExp> = {
    education: /^(education|academic\s*background|qualification)/i,
    experience: /^(experience|work\s*experience|employment|internship|leadership)/i,
    projects: /^(projects|portfolio|personal\s*projects|academic\s*projects)/i,
    certifications: /^(certification|certifications?\s*&?\s*seminars?|seminars?|training|certificates?)/i,
    achievements: /^(achievement|achievements|awards?|honor)/i,
    skills: /^(skills|technical\s*skills|programming|additional\s*skills)/i,
  };

  lines.forEach((line, idx) => {
    for (const [section, pattern] of Object.entries(headerPatterns)) {
      if (pattern.test(line) && line.length < 60) {
        sectionIndices.push({ type: section, startIdx: idx });
      }
    }
  });

  // Sort by index
  sectionIndices.sort((a, b) => a.startIdx - b.startIdx);

  // Extract content lines for each section
  function getSectionLines(sectionType: string): string[] {
    const results: string[] = [];
    for (let i = 0; i < sectionIndices.length; i++) {
      if (sectionIndices[i].type === sectionType) {
        const start = sectionIndices[i].startIdx + 1;
        const end = i + 1 < sectionIndices.length ? sectionIndices[i + 1].startIdx : lines.length;
        for (let j = start; j < end; j++) {
          if (lines[j] && lines[j].length > 0) {
            results.push(lines[j]);
          }
        }
      }
    }
    return results;
  }

  // Parse education entries
  // Pattern: institution name + year range on same or adjacent lines
  const educationLines = getSectionLines('education');
  const education: ResumeProfile['education'] = [];
  const yearRangePattern = /(\d{4})\s*[-–—]\s*(\d{4}|[Pp]resent)/;

  let i = 0;
  while (i < educationLines.length) {
    const line = educationLines[i];
    const yearMatch = line.match(yearRangePattern);

    if (yearMatch) {
      // This line has a year range — it's likely "Institution YYYY - YYYY"
      const institution = line.replace(yearRangePattern, '').trim();
      const endYear = yearMatch[2].toLowerCase() === 'present' ? 'Present' : yearMatch[2];

      // Look ahead for a degree line (next line without a year range)
      let degree = '';
      if (i + 1 < educationLines.length && !yearRangePattern.test(educationLines[i + 1])) {
        // Check if next line looks like a degree
        const nextLine = educationLines[i + 1];
        if (/bachelor|master|associate|diploma|doctor|b\.?s\.?|m\.?s\.?|ph\.?d|science|arts|engineering/i.test(nextLine)) {
          degree = nextLine;
          i++;
        }
      }

      education.push({
        degree: degree || '',
        institution: institution || line.replace(yearRangePattern, '').trim(),
        year: endYear,
      });
    } else if (/bachelor|master|associate|diploma|doctor|b\.?s\.?|m\.?s\.?|ph\.?d/i.test(line)) {
      // This line is a degree without a year — check if previous entry needs it
      if (education.length > 0 && !education[education.length - 1].degree) {
        education[education.length - 1].degree = line;
      } else {
        education.push({ degree: line, institution: '', year: '' });
      }
    }
    i++;
  }

  // Parse experience entries
  // Pattern: role/organization + year range, with possible highlights below
  const experienceLines = getSectionLines('experience');
  const experience: ResumeProfile['experience'] = [];

  i = 0;
  while (i < experienceLines.length) {
    const line = experienceLines[i];
    const yearMatch = line.match(yearRangePattern);

    if (yearMatch) {
      const titleOrOrg = line.replace(yearRangePattern, '').replace(/[-–—,]\s*$/, '').trim();
      const duration = yearMatch[0];

      // Try to split into title and organization
      // Common separators: " - ", " at ", " | ", ","
      let title = titleOrOrg;
      let organization = '';
      const separatorMatch = titleOrOrg.match(/^(.+?)\s*[-–—|]\s*(.+)$/);
      if (separatorMatch) {
        organization = separatorMatch[1].trim();
        title = separatorMatch[2].trim() || separatorMatch[1].trim();
      } else {
        organization = titleOrOrg;
        title = '';
      }

      // Collect highlight lines (lines that follow without a year range, often starting with • or -)
      const highlights: string[] = [];
      while (i + 1 < experienceLines.length && !yearRangePattern.test(experienceLines[i + 1])) {
        i++;
        const hLine = experienceLines[i].replace(/^[•\-*]\s*/, '').trim();
        if (hLine.length > 0 && hLine.length < 200) {
          highlights.push(hLine);
        }
      }

      experience.push({
        title: title || organization,
        organization: organization,
        duration: duration,
        highlights: highlights,
      });
    }
    i++;
  }

  // Parse certifications — lines under the certifications header that aren't empty
  const certLines = getSectionLines('certifications');
  const certifications: string[] = [];
  for (const line of certLines) {
    // Skip lines that are just dates or very short
    if (line.length > 3 && !/^\d{4}$/.test(line)) {
      const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
      if (cleaned.length > 3) {
        certifications.push(cleaned);
      }
    }
  }

  // Parse achievements
  const achievementLines = getSectionLines('achievements');
  const achievements: string[] = [];
  for (const line of achievementLines) {
    const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
    if (cleaned.length > 3) {
      achievements.push(cleaned);
    }
  }

  // Parse projects
  const projectLines = getSectionLines('projects');
  const projects: ResumeProfile['projects'] = [];
  i = 0;
  while (i < projectLines.length) {
    const line = projectLines[i];
    // A project entry typically starts with a name (may have a year or dash separator)
    if (line.length > 3 && !line.startsWith('•') && !line.startsWith('-')) {
      const name = line.replace(yearRangePattern, '').replace(/[-–—]\s*$/, '').trim();
      const descLines: string[] = [];
      const techs: string[] = [];

      // Collect description lines
      while (i + 1 < projectLines.length) {
        const nextLine = projectLines[i + 1];
        if (nextLine.length > 3 && !nextLine.startsWith('•') && !nextLine.startsWith('-') && !yearRangePattern.test(nextLine)) {
          break; // likely next project
        }
        i++;
        const cleaned = projectLines[i].replace(/^[•\-*]\s*/, '').trim();
        // Check for tech stack indicators
        if (/\b(tech|stack|built with|using|technologies?)\b/i.test(cleaned)) {
          const techStr = cleaned.replace(/.*?:\s*/, '');
          techs.push(...techStr.split(/[,|]/).map(t => t.trim()).filter(Boolean));
        } else if (cleaned.length > 3) {
          descLines.push(cleaned);
        }
      }

      if (name.length > 2) {
        projects.push({
          name,
          description: descLines.join(' ').slice(0, 200),
          technologies: techs,
          outcome: undefined,
        });
      }
    }
    i++;
  }

  console.log(`[Local Profile Fallback] Extracted: ${education.length} education, ${experience.length} experience, ${certifications.length} certifications, ${projects.length} projects`);

  return {
    experience,
    projects,
    certifications,
    achievements,
    education,
  };
}


/**
 * Local fallback: Extracts skills from resume text using intelligent keyword pattern matching.
 * Used when ALL AI providers are unavailable (Gemini + OpenAI both exhausted).
 * 
 * Strategy:
 * 1. Detect resume sections (Skills, Experience, Projects, Certifications)
 * 2. Skills listed in a dedicated "Skills" section → intermediate by default
 * 3. Skills used in projects with measurable outcomes → advanced
 * 4. Skills where the person led/taught others → advanced/expert
 * 5. Skills only in certifications/seminars → beginner
 */
function extractSkillsLocally(
  resumeText: string
): Array<{ name: string; proficiency_level: "beginner" | "intermediate" | "advanced" | "expert" }> {
  const text = resumeText.toLowerCase();
  const lines = resumeText.split("\n").map(l => l.trim()).filter(Boolean);

  // Detect sections
  const sections = detectSections(lines);

  // Comprehensive skill database with search patterns
  const skillDB: Array<{ name: string; patterns: RegExp[] }> = [
    // Programming languages
    { name: "C++", patterns: [/\bc\+\+\b/, /\bcpp\b/] },
    { name: "C", patterns: [/\bc\b(?![\+#s])/i, /\bc,/, /\bc language/] },
    { name: "Java", patterns: [/\bjava\b(?!script)/] },
    { name: "JavaScript", patterns: [/\bjavascript\b/, /\bjs\b/] },
    { name: "Python", patterns: [/\bpython\b/] },
    { name: "C#", patterns: [/\bc#\b/, /\bcsharp\b/] },
    { name: "TypeScript", patterns: [/\btypescript\b/] },
    { name: "PHP", patterns: [/\bphp\b/] },
    { name: "Ruby", patterns: [/\bruby\b/] },
    { name: "Go", patterns: [/\bgolang\b/, /\bgo\s+programming\b/] },
    { name: "Rust", patterns: [/\brust\b/] },
    { name: "Swift", patterns: [/\bswift\b/] },
    { name: "Kotlin", patterns: [/\bkotlin\b/] },
    { name: "R", patterns: [/\br\s+programming\b/, /\br\s+language\b/] },

    // Frontend
    { name: "React", patterns: [/\breact\b/, /\breactjs\b/, /\breact\.js\b/] },
    { name: "Next.js", patterns: [/\bnext\.?js\b/, /\bnext\s*js\b/] },
    { name: "Vue", patterns: [/\bvue\b/, /\bvuejs\b/] },
    { name: "Angular", patterns: [/\bangular\b/] },
    { name: "Svelte", patterns: [/\bsvelte\b/] },
    { name: "HTML", patterns: [/\bhtml\b/] },
    { name: "CSS", patterns: [/\bcss\b/] },
    { name: "Tailwind CSS", patterns: [/\btailwind\b/] },
    { name: "Bootstrap", patterns: [/\bbootstrap\b/] },
    { name: "Vite", patterns: [/\bvite\b/] },
    { name: "Prettier", patterns: [/\bprettier\b/] },
    { name: "Responsive Design", patterns: [/\bresponsive\b/] },

    // Backend
    { name: "Node.js", patterns: [/\bnode\.?js\b/, /\bnodejs\b/] },
    { name: "Flask", patterns: [/\bflask\b/] },
    { name: "Django", patterns: [/\bdjango\b/] },
    { name: "Spring Boot", patterns: [/\bspring\s*boot\b/, /\bspring\s+framework\b/] },
    { name: "Express", patterns: [/\bexpress\.?js\b/, /\bexpress\s+server\b/] },
    { name: "FastAPI", patterns: [/\bfastapi\b/] },
    { name: "REST APIs", patterns: [/\brest\s*api\b/, /\brestful\b/] },

    // AI/ML
    { name: "TensorFlow", patterns: [/\btensorflow\b/] },
    { name: "PyTorch", patterns: [/\bpytorch\b/] },
    { name: "YOLO", patterns: [/\byolo\b/, /\byolov\d+\b/] },
    { name: "OpenCV", patterns: [/\bopencv\b/, /\bopen\s*cv\b/] },
    { name: "Scikit Learn", patterns: [/\bscikit\b/, /\bsklearn\b/] },
    { name: "OpenAI", patterns: [/\bopenai\b/] },
    { name: "Gemini", patterns: [/\bgemini\b/, /\bgemma\b/] },
    { name: "Google Colab", patterns: [/\bcolab\b/, /\bgoogle\s*colab\b/] },
    { name: "Ollama", patterns: [/\bollama\b/] },
    { name: "Machine Learning", patterns: [/\bmachine\s*learning\b/] },
    { name: "Deep Learning", patterns: [/\bdeep\s*learning\b/] },
    { name: "Computer Vision", patterns: [/\bcomputer\s*vision\b/] },
    { name: "NLP", patterns: [/\bnlp\b/, /\bnatural\s*language\s*processing\b/] },

    // Design
    { name: "Figma", patterns: [/\bfigma\b/] },
    { name: "Canva", patterns: [/\bcanva\b/] },
    { name: "Adobe XD", patterns: [/\badobe\s*xd\b/] },
    { name: "UI/UX Design", patterns: [/\bui\/ux\b/, /\bux\s*design\b/, /\bui\s*design\b/] },
    { name: "Prototyping", patterns: [/\bprototyp/] },

    // Testing/QA
    { name: "Manual Testing", patterns: [/\bmanual\s*testing\b/] },
    { name: "Functional Testing", patterns: [/\bfunctional\s*testing\b/] },
    { name: "Cross-Browser Testing", patterns: [/\bcross[\s-]*browser\s*testing\b/] },
    { name: "Debugging", patterns: [/\bdebugging\b/] },
    { name: "Unit Testing", patterns: [/\bunit\s*test/] },
    { name: "QA", patterns: [/\bquality\s*assurance\b/, /\bqa\b/] },

    // DevOps/Tools
    { name: "Docker", patterns: [/\bdocker\b/] },
    { name: "Kubernetes", patterns: [/\bkubernetes\b/, /\bk8s\b/] },
    { name: "Git", patterns: [/\bgit\b/, /\bgithub\b/, /\bgitlab\b/] },
    { name: "CI/CD", patterns: [/\bci\/cd\b/, /\bcicd\b/, /\bcontinuous\s*integration\b/] },
    { name: "Linux", patterns: [/\blinux\b/, /\bubuntu\b/] },
    { name: "AWS", patterns: [/\baws\b/, /\bamazon\s*web\s*services\b/] },
    { name: "GCP", patterns: [/\bgcp\b/, /\bgoogle\s*cloud\b/] },
    { name: "Azure", patterns: [/\bazure\b/] },

    // Databases
    { name: "SQL", patterns: [/\bsql\b/, /\bmysql\b/, /\bpostgresql\b/, /\bpostgres\b/] },
    { name: "MongoDB", patterns: [/\bmongodb\b/, /\bmongo\b/] },
    { name: "Firebase", patterns: [/\bfirebase\b/] },
    { name: "Supabase", patterns: [/\bsupabase\b/] },
    { name: "Redis", patterns: [/\bredis\b/] },

    // Soft skills
    { name: "Analytical Thinking", patterns: [/\banalytical\s*thinking\b/, /\banalytical\s*skills?\b/] },
    { name: "Team Collaboration", patterns: [/\bteam\s*collaboration\b/, /\bteamwork\b/, /\bcollaborat/] },
    { name: "Problem-Solving", patterns: [/\bproblem[\s-]*solving\b/] },
    { name: "Communication", patterns: [/\bcommunication\b/] },
    { name: "Organizational Skills", patterns: [/\borganizational\b/] },
    { name: "Leadership", patterns: [/\bleadership\b/] },
    { name: "Project Management", patterns: [/\bproject\s*management\b/] },

    // Office/Other
    { name: "Microsoft Excel", patterns: [/\bexcel\b/] },
    { name: "Microsoft Word", patterns: [/\bmicrosoft\s*word\b/, /\bms\s*word\b/] },
    { name: "Google Suite", patterns: [/\bgsuite\b/, /\bgoogle\s*(suite|workspace)\b/] },
    { name: "Microsoft Teams", patterns: [/\bteams\b/] },
    { name: "Outlook", patterns: [/\boutlook\b/] },
  ];

  const found: Array<{ name: string; proficiency_level: "beginner" | "intermediate" | "advanced" | "expert" }> = [];
  const seen = new Set<string>();

  for (const skill of skillDB) {
    const isPresent = skill.patterns.some(p => p.test(text));
    if (!isPresent) continue;

    const key = skill.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Determine proficiency based on context
    const level = assessProficiency(skill.name, text, sections);
    found.push({ name: skill.name, proficiency_level: level });
  }

  console.log(`[Local Fallback] Extracted ${found.length} skills from resume text`);
  return found;
}

/**
 * Detects resume sections by looking for common headings.
 */
function detectSections(lines: string[]): { 
  skills: string; experience: string; projects: string; certifications: string; education: string 
} {
  const result = { skills: "", experience: "", projects: "", certifications: "", education: "" };
  let currentSection = "";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/^(skills|technical\s*skills|additional|programming)/i.test(lower)) {
      currentSection = "skills";
    } else if (/^(experience|work\s*experience|employment)/i.test(lower)) {
      currentSection = "experience";
    } else if (/^(projects|personal\s*projects|academic\s*projects)/i.test(lower)) {
      currentSection = "projects";
    } else if (/^(certifications?|seminars?|training|certificates?)/i.test(lower)) {
      currentSection = "certifications";
    } else if (/^(education|academic)/i.test(lower)) {
      currentSection = "education";
    } else if (currentSection) {
      result[currentSection as keyof typeof result] += " " + line;
    }
  }

  return result;
}

/**
 * Assesses proficiency level based on where and how a skill is mentioned.
 */
function assessProficiency(
  skillName: string,
  fullText: string,
  sections: { skills: string; experience: string; projects: string; certifications: string }
): "beginner" | "intermediate" | "advanced" | "expert" {
  const skillLower = skillName.toLowerCase();
  const skillRegex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "i");

  // Check if skill is in experience section with leadership indicators
  const inExperience = skillRegex.test(sections.experience);
  const inProjects = skillRegex.test(sections.projects);
  const inSkillsSection = skillRegex.test(sections.skills);
  const inCerts = skillRegex.test(sections.certifications);

  // Leadership/lead indicators near the skill
  const hasLeadership = /\b(led|lead|heading|managed|architected|designed and developed)\b/i.test(fullText);
  
  // Measurable outcomes near the skill
  const hasMetrics = /\b(\d+%|\d+\s*percent|improved|increased|reduced|achieved|optimiz)/i.test(fullText);

  // Built/developed projects
  const hasBuilt = /\b(built|developed|created|implemented|deployed)\b/i.test(fullText);

  // Expert: led teams or workshops, has significant metrics
  if (inExperience && hasLeadership && hasMetrics) return "expert";
  
  // Advanced: used in real projects with outcomes, or in experience section
  if (inExperience && hasBuilt) return "advanced";
  if (inProjects && hasMetrics) return "advanced";
  if (inProjects && hasBuilt) return "advanced";
  
  // Intermediate: in skills section or used in projects
  if (inSkillsSection) return "intermediate";
  if (inProjects) return "intermediate";
  if (inExperience) return "intermediate";
  
  // Beginner: only in certifications or mentioned without context
  if (inCerts) return "beginner";
  
  return "intermediate";
}
