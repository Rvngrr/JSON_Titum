/**
 * Skill Extractor Service — LLM primary, local fallback.
 *
 * Analyzes job description text and extracts skills using LLM with contextual
 * understanding. Falls back to local keyword matching if LLM is unavailable
 * or returns malformed JSON.
 *
 * Called once per imported job during import; results stored in `job_required_skills` table.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import { computeHash } from '../llm/utils';
import { createAdminClient } from '../supabase/server';
import type { ExtractedSkill, SkillExtractionResult } from './types';

// ---------------------------------------------------------------------------
// Skill synonym map for normalization
// Reuses the same canonical mappings as the local matcher
// ---------------------------------------------------------------------------

const SKILL_SYNONYMS: Record<string, string[]> = {
  "javascript": ["js", "ecmascript", "es6", "es2015", "es2020", "vanilla js"],
  "typescript": ["ts"],
  "react": ["react.js", "reactjs", "react js", "react framework"],
  "next.js": ["nextjs", "next", "next js"],
  "node.js": ["nodejs", "node", "node js"],
  "vue": ["vue.js", "vuejs", "vue js"],
  "angular": ["angularjs", "angular.js"],
  "python": ["python3", "python 3", "py"],
  "java": ["jdk", "java se"],
  "c++": ["cpp", "cplusplus", "c plus plus"],
  "c#": ["csharp", "c sharp"],
  "html/css": ["html", "css", "html5", "css3", "html & css", "html and css"],
  "html": ["html5", "hypertext markup language"],
  "css": ["css3", "cascading style sheets", "stylesheet"],
  "tailwind css": ["tailwind", "tailwindcss", "tailwind framework"],
  "sql": ["mysql", "postgresql", "postgres", "sqlite", "sql server", "mssql"],
  "rest apis": ["rest", "restful", "rest api", "restful api", "api development"],
  "docker": ["containerization", "containers", "docker compose"],
  "git": ["github", "gitlab", "version control", "git version control"],
  "machine learning": ["ml", "deep learning", "neural networks", "ai", "artificial intelligence"],
  "tensorflow": ["tf", "keras", "tensorflow framework"],
  "scikit learn": ["sklearn", "scikit-learn", "scikit"],
  "openai": ["openai api", "gpt", "chatgpt", "gpt-4", "gpt-4o"],
  "gemini": ["gemini api", "google gemini", "gemma", "gemma 3"],
  "figma": ["figma design", "figma prototyping"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous deployment", "github actions", "jenkins"],
  "linux": ["ubuntu", "debian", "centos", "unix"],
  "cloud services": ["aws", "gcp", "azure", "cloud computing", "cloud"],
  "flask": ["flask framework", "flask python"],
  "spring boot": ["spring", "spring framework"],
  "manual testing": ["manual qa", "manual quality assurance"],
  "debugging": ["debug", "troubleshooting", "bug fixing"],
  "responsive design": ["responsive web design", "mobile responsive", "responsive", "responsive ui"],
  "opencv": ["open cv", "cv2", "computer vision"],
  "deep learning": ["dl", "neural networks", "deep neural networks", "dnn"],
  "prompt engineering": ["prompt design", "llm prompting"],
  "vite": ["vitejs", "vite bundler"],
  "excel": ["microsoft excel", "ms excel", "spreadsheets"],
  "microsoft word": ["ms word", "word"],
  "gsuite": ["google suite", "google workspace", "g suite"],
  "analytical thinking": ["analytical skills", "analysis", "critical thinking"],
  "team collaboration": ["teamwork", "team work", "collaboration", "collaborative"],
  "problem-solving": ["problem solving", "troubleshooting"],
  "effective communication": ["communication", "communication skills"],
  "organizational skills": ["organization", "project management"],
  "agile": ["scrum", "kanban", "agile methodology"],
  "mongodb": ["mongo", "mongoose"],
  "redis": ["redis cache", "redis db"],
  "graphql": ["graphql api", "apollo graphql"],
  "kubernetes": ["k8s", "container orchestration"],
  "terraform": ["infrastructure as code", "iac"],
  "rust": ["rust lang", "rust programming"],
  "go": ["golang", "go lang"],
  "swift": ["swift programming", "ios development"],
  "kotlin": ["kotlin android", "kotlin programming"],
  "php": ["php7", "php8", "laravel", "symfony"],
  "ruby": ["ruby on rails", "rails", "ror"],
  "sass": ["scss", "sass css"],
  "webpack": ["webpack bundler", "module bundler"],
  "aws": ["amazon web services"],
  "gcp": ["google cloud platform", "google cloud"],
  "azure": ["microsoft azure", "azure cloud"],
};

// ---------------------------------------------------------------------------
// Synonym normalization utilities
// ---------------------------------------------------------------------------

function normalize(skill: string): string {
  return skill.toLowerCase().trim().replace(/[.\-_]/g, '').replace(/\s+/g, ' ');
}

function buildSynonymLookup(): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const normalizedCanonical = normalize(canonical);
    lookup.set(normalizedCanonical, canonical);

    for (const synonym of synonyms) {
      lookup.set(normalize(synonym), canonical);
    }
  }

  return lookup;
}

const synonymLookup = buildSynonymLookup();

/**
 * Normalizes a skill name to its canonical form using the synonym map.
 * If no synonym match is found, returns the original name in lowercase trimmed form.
 */
export function normalizeSkillName(skill: string): string {
  const normalized = normalize(skill);
  return synonymLookup.get(normalized) || skill.toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// LLM prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a technical recruiter AI that extracts skills from job descriptions.
Return a JSON object with a "skills" array of objects. Each object has: skillName (string), importance ("required" or "preferred"), rawText (string - the phrase where the skill was mentioned).
Classify as "required" if the context says "must have", "required", "essential", "mandatory", or appears in a requirements/qualifications section.
Classify as "preferred" if the context says "nice to have", "preferred", "bonus", "plus", or appears in a benefits/nice-to-have section.
If the context is ambiguous, default to "required".
Extract both technical skills (programming languages, frameworks, tools) and soft skills (communication, leadership, teamwork).`;

function buildUserPrompt(
  description: string,
  qualifications: string | null,
  highlights: string[]
): string {
  let prompt = `Extract all technical and soft skills from this job description:\n\n${description}`;

  if (qualifications) {
    prompt += `\n\nQualifications: ${qualifications}`;
  }

  if (highlights.length > 0) {
    prompt += `\n\nHighlights:\n${highlights.join('\n')}`;
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// LLM-based skill extraction (primary path)
// ---------------------------------------------------------------------------

/**
 * Extracts skills from a job description using LLM with contextual understanding.
 * Falls back to local keyword matching if LLM is unavailable or returns malformed JSON.
 */
export async function extractSkillsFromJob(
  description: string,
  qualifications: string | null,
  highlights: string[]
): Promise<SkillExtractionResult> {
  // Build the combined text for hashing (cache key)
  const combinedText = [
    description,
    qualifications || '',
    highlights.join(' '),
  ].join('|||');

  const sourceHash = computeHash(combinedText);
  const cacheKey = `${sourceHash}_skill_extraction`;

  try {
    const response = await completeWithCache(
      {
        prompt: buildUserPrompt(description, qualifications, highlights),
        systemPrompt: SYSTEM_PROMPT,
        responseFormat: 'json',
        temperature: 0.1,
      },
      cacheKey,
      'skill_extraction',
      sourceHash
    );

    // Parse LLM response
    const parsed = parseLLMResponse(response.content);

    if (parsed) {
      // Normalize skill names
      const normalizedSkills = parsed.map((skill) => ({
        ...skill,
        skillName: normalizeSkillName(skill.skillName),
        confidence: skill.confidence ?? 0.9,
      }));

      return {
        skills: normalizedSkills,
        source: {
          method: 'llm',
          provider: response.provider,
        },
      };
    }

    // Malformed JSON from LLM — fall back to local
    return {
      skills: extractSkillsLocal(description, qualifications, highlights),
      source: { method: 'local' },
    };
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError) {
      // All providers failed — use local fallback
      return {
        skills: extractSkillsLocal(description, qualifications, highlights),
        source: { method: 'local' },
      };
    }
    // Unexpected error — still fall back to local
    return {
      skills: extractSkillsLocal(description, qualifications, highlights),
      source: { method: 'local' },
    };
  }
}

// ---------------------------------------------------------------------------
// LLM response parsing
// ---------------------------------------------------------------------------

interface RawLLMSkill {
  skillName?: string;
  skill_name?: string;
  name?: string;
  importance?: string;
  rawText?: string;
  raw_text?: string;
  context?: string;
  confidence?: number;
}

/**
 * Parses the LLM JSON response into ExtractedSkill[].
 * Returns null if the response is not valid JSON or doesn't match the expected shape.
 */
function parseLLMResponse(content: string): ExtractedSkill[] | null {
  try {
    const data = JSON.parse(content);

    // The LLM might return { skills: [...] } or just [...]
    let skillsArray: RawLLMSkill[];

    if (Array.isArray(data)) {
      skillsArray = data;
    } else if (data && Array.isArray(data.skills)) {
      skillsArray = data.skills;
    } else {
      return null;
    }

    if (skillsArray.length === 0) {
      return null;
    }

    const skills: ExtractedSkill[] = [];

    for (const item of skillsArray) {
      // Handle various field naming conventions the LLM might use
      const skillName = item.skillName || item.skill_name || item.name;
      if (!skillName || typeof skillName !== 'string') continue;

      const importance = normalizeImportance(item.importance);
      const rawText = item.rawText || item.raw_text || item.context || skillName;
      const confidence = typeof item.confidence === 'number'
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.9;

      skills.push({
        skillName: skillName.trim(),
        importance,
        rawText: typeof rawText === 'string' ? rawText.trim() : skillName,
        confidence,
      });
    }

    return skills.length > 0 ? skills : null;
  } catch {
    // JSON parse failed — malformed response
    return null;
  }
}

function normalizeImportance(value: unknown): 'required' | 'preferred' {
  if (typeof value !== 'string') return 'required';
  const lower = value.toLowerCase().trim();
  if (lower === 'preferred' || lower === 'nice to have' || lower === 'bonus') {
    return 'preferred';
  }
  return 'required';
}

// ---------------------------------------------------------------------------
// Local keyword-based skill extraction (fallback path)
// ---------------------------------------------------------------------------

/**
 * Extracts skills locally by scanning the text for known skill keywords.
 * Used as fallback when LLM is unavailable or returns malformed data.
 */
export function extractSkillsLocal(
  description: string,
  qualifications: string | null,
  highlights: string[]
): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];
  const seenSkills = new Set<string>();

  // Build text sections with importance context
  const descriptionLower = description.toLowerCase();
  const qualificationsLower = (qualifications || '').toLowerCase();
  const highlightsLower = highlights.map((h) => h.toLowerCase());
  const allText = [descriptionLower, qualificationsLower, ...highlightsLower].join(' ');

  // Check all canonical skills and their synonyms against the text
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const allForms = [canonical, ...synonyms];

    for (const form of allForms) {
      const formLower = form.toLowerCase();

      if (textContainsSkill(allText, formLower)) {
        // Avoid duplicates (same canonical skill)
        if (seenSkills.has(canonical)) break;
        seenSkills.add(canonical);

        // Determine importance from context
        const importance = classifyImportanceFromContext(
          formLower,
          descriptionLower,
          qualificationsLower,
          highlightsLower
        );

        // Find the raw text where this skill appears
        const rawText = findRawText(form, description, qualifications, highlights);

        skills.push({
          skillName: normalizeSkillName(canonical),
          importance,
          rawText,
          confidence: 0.7, // Lower confidence for local extraction
        });

        break; // Found this skill, move to next canonical
      }
    }
  }

  return skills;
}

/**
 * Checks if text contains a skill keyword (word boundary aware for short skills).
 */
function textContainsSkill(text: string, skill: string): boolean {
  // For short skills (1-2 chars like "c", "go"), require word boundaries
  if (skill.length <= 2) {
    const regex = new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i');
    return regex.test(text);
  }

  return text.includes(skill);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Classifies importance based on surrounding context keywords.
 */
function classifyImportanceFromContext(
  skill: string,
  description: string,
  qualifications: string,
  highlights: string[]
): 'required' | 'preferred' {
  const requiredIndicators = [
    'must have', 'required', 'essential', 'mandatory',
    'minimum requirement', 'must possess', 'need to have',
  ];
  const preferredIndicators = [
    'nice to have', 'preferred', 'bonus', 'plus',
    'advantage', 'desirable', 'optional',
  ];

  // Check qualifications section — typically "required"
  if (qualifications && qualifications.includes(skill)) {
    return 'required';
  }

  // Look for context around the skill mention
  const allTexts = [description, ...highlights];

  for (const text of allTexts) {
    const skillIndex = text.indexOf(skill);
    if (skillIndex === -1) continue;

    // Check surrounding 200 chars for context indicators
    const contextStart = Math.max(0, skillIndex - 100);
    const contextEnd = Math.min(text.length, skillIndex + skill.length + 100);
    const context = text.substring(contextStart, contextEnd);

    for (const indicator of preferredIndicators) {
      if (context.includes(indicator)) return 'preferred';
    }

    for (const indicator of requiredIndicators) {
      if (context.includes(indicator)) return 'required';
    }
  }

  // Default to 'required' when context is ambiguous
  return 'required';
}

/**
 * Finds the raw text snippet where a skill is mentioned.
 */
function findRawText(
  skill: string,
  description: string,
  qualifications: string | null,
  highlights: string[]
): string {
  const texts = [description, qualifications || '', ...highlights];
  const skillLower = skill.toLowerCase();

  for (const text of texts) {
    const index = text.toLowerCase().indexOf(skillLower);
    if (index !== -1) {
      // Extract a short snippet around the skill mention
      const start = Math.max(0, index - 30);
      const end = Math.min(text.length, index + skill.length + 30);
      return text.substring(start, end).trim();
    }
  }

  return skill;
}

// ---------------------------------------------------------------------------
// Database insertion
// ---------------------------------------------------------------------------

/**
 * Inserts extracted skills into the `job_required_skills` table for the given job.
 */
export async function insertSkillsForJob(
  jobDescriptionId: string,
  skills: ExtractedSkill[]
): Promise<void> {
  if (skills.length === 0) return;

  const supabase = createAdminClient();

  const records = skills.map((skill) => ({
    job_description_id: jobDescriptionId,
    skill_name: skill.skillName,
    importance: skill.importance,
  }));

  const { error } = await supabase
    .from('job_required_skills')
    .insert(records);

  if (error) {
    console.error(`Failed to insert skills for job ${jobDescriptionId}:`, error.message);
    throw new Error(`Failed to insert skills: ${error.message}`);
  }
}
