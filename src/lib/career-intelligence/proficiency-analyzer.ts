/**
 * Proficiency Analyzer — LLM primary, local keyword matching fallback.
 *
 * Determines skill proficiency levels (beginner, intermediate, expert) from
 * resume context using LLM analysis. Falls back to local keyword matching
 * if LLM is unavailable or returns malformed JSON.
 *
 * Called once per resume upload/update; results cached in skill profile.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import { computeHash } from '../llm/utils';
import type { ProficiencyBatchResult, ProficiencyResult } from './types';

// ---------------------------------------------------------------------------
// Proficiency indicators for local fallback
// ---------------------------------------------------------------------------

const EXPERT_INDICATORS = [
  'led',
  'architected',
  '5+ years',
  'mentored',
  'senior',
  'principal',
];

const INTERMEDIATE_INDICATORS = [
  'used',
  'developed',
  '2-4 years',
  'implemented',
  'contributed',
];

const BEGINNER_INDICATORS = [
  'familiar',
  'basic',
  'course',
  '1 year',
  'learning',
  'exposure',
];

// ---------------------------------------------------------------------------
// LLM prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert career analyst. Analyze the resume text to determine skill proficiency levels. Return a JSON object with a "skills" array of objects. Each object has: skillName (string), level ("beginner", "intermediate", or "expert"), evidence (string - the relevant text snippet that supports the classification).

Guidelines:
- expert: Led teams, architected systems, 5+ years experience, mentored others, senior/principal roles
- intermediate: Used in projects, developed features, 2-4 years experience, implemented solutions, contributed to projects
- beginner: Familiar with, basic knowledge, coursework, less than 1 year, learning, exposure

If you cannot determine proficiency from the context for a skill, default to "intermediate".`;

function buildBatchPrompt(skills: string[], resumeText: string): string {
  return `Determine proficiency levels for these skills: ${skills.join(', ')}

Resume text:
${resumeText}`;
}

function buildSinglePrompt(skillName: string, surroundingText: string): string {
  return `Determine the proficiency level for the skill "${skillName}" based on this context:

${surroundingText}`;
}

// ---------------------------------------------------------------------------
// LLM-based proficiency analysis (primary path)
// ---------------------------------------------------------------------------

/**
 * Analyzes proficiency for a single skill using LLM.
 * Falls back to local keyword matching if LLM is unavailable.
 */
export async function analyzeSkillProficiency(
  skillName: string,
  surroundingText: string
): Promise<ProficiencyResult> {
  const sourceHash = computeHash(surroundingText);
  const cacheKey = `${sourceHash}_proficiency_analysis_${computeHash(skillName)}`;

  try {
    const response = await completeWithCache(
      {
        prompt: buildSinglePrompt(skillName, surroundingText),
        systemPrompt: SYSTEM_PROMPT,
        responseFormat: 'json',
        temperature: 0.1,
      },
      cacheKey,
      'proficiency_analysis',
      sourceHash
    );

    // Parse LLM response
    const parsed = parseLLMResponse(response.content);

    if (parsed && parsed.length > 0) {
      // Find the result for the requested skill (or take the first one)
      const match = parsed.find(
        (r) => r.skillName.toLowerCase() === skillName.toLowerCase()
      ) || parsed[0];

      return {
        skillName,
        level: match.level,
        evidence: match.evidence,
        confidence: 0.9,
      };
    }

    // Malformed JSON — fall back to local
    return analyzeProficiencyLocal(skillName, surroundingText);
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError) {
      return analyzeProficiencyLocal(skillName, surroundingText);
    }
    // Unexpected error — still fall back to local
    return analyzeProficiencyLocal(skillName, surroundingText);
  }
}

/**
 * Batch analysis: analyzes proficiency for multiple skills in a single LLM call.
 * Falls back to local keyword matching if LLM is unavailable.
 */
export async function analyzeProficiencyBatch(
  skills: string[],
  resumeText: string
): Promise<ProficiencyBatchResult> {
  if (skills.length === 0) {
    return { results: [], source: { method: 'local' } };
  }

  const sourceHash = computeHash(resumeText);
  const cacheKey = `${sourceHash}_proficiency_analysis`;

  try {
    const response = await completeWithCache(
      {
        prompt: buildBatchPrompt(skills, resumeText),
        systemPrompt: SYSTEM_PROMPT,
        responseFormat: 'json',
        temperature: 0.1,
      },
      cacheKey,
      'proficiency_analysis',
      sourceHash
    );

    // Parse LLM response
    const parsed = parseLLMResponse(response.content);

    if (parsed && parsed.length > 0) {
      // Map results to requested skills, filling in any missing ones
      const results = mapResultsToSkills(skills, parsed);

      return {
        results,
        source: {
          method: 'llm',
          provider: response.provider,
        },
      };
    }

    // Malformed JSON from LLM — fall back to local
    return {
      results: analyzeProficiencyBatchLocal(skills, resumeText),
      source: { method: 'local' },
    };
  } catch (error: unknown) {
    if (error instanceof LLMUnavailableError) {
      return {
        results: analyzeProficiencyBatchLocal(skills, resumeText),
        source: { method: 'local' },
      };
    }
    // Unexpected error — still fall back to local
    return {
      results: analyzeProficiencyBatchLocal(skills, resumeText),
      source: { method: 'local' },
    };
  }
}

// ---------------------------------------------------------------------------
// Local keyword-based proficiency analysis (fallback path)
// ---------------------------------------------------------------------------

/**
 * Analyzes proficiency for a single skill using local keyword matching.
 * Used as fallback when LLM is unavailable or returns malformed data.
 */
export function analyzeProficiencyLocal(
  skillName: string,
  surroundingText: string
): ProficiencyResult {
  const textLower = surroundingText.toLowerCase();

  // Check expert indicators first (highest priority)
  for (const indicator of EXPERT_INDICATORS) {
    if (textLower.includes(indicator)) {
      return {
        skillName,
        level: 'expert',
        evidence: findEvidenceSnippet(surroundingText, indicator),
        confidence: 0.7,
      };
    }
  }

  // Check beginner indicators next
  for (const indicator of BEGINNER_INDICATORS) {
    if (textLower.includes(indicator)) {
      return {
        skillName,
        level: 'beginner',
        evidence: findEvidenceSnippet(surroundingText, indicator),
        confidence: 0.7,
      };
    }
  }

  // Check intermediate indicators
  for (const indicator of INTERMEDIATE_INDICATORS) {
    if (textLower.includes(indicator)) {
      return {
        skillName,
        level: 'intermediate',
        evidence: findEvidenceSnippet(surroundingText, indicator),
        confidence: 0.7,
      };
    }
  }

  // Default to intermediate when no indicators found
  return {
    skillName,
    level: 'intermediate',
    evidence: 'No specific proficiency indicators found in context',
    confidence: 0.5,
  };
}

/**
 * Batch local analysis: analyzes proficiency for multiple skills using keyword matching.
 */
export function analyzeProficiencyBatchLocal(
  skills: string[],
  resumeText: string
): ProficiencyResult[] {
  return skills.map((skill) => {
    // Extract surrounding context for this skill from the resume text
    const context = extractSkillContext(skill, resumeText);
    return analyzeProficiencyLocal(skill, context);
  });
}

// ---------------------------------------------------------------------------
// LLM response parsing
// ---------------------------------------------------------------------------

interface RawLLMProficiency {
  skillName?: string;
  skill_name?: string;
  name?: string;
  level?: string;
  proficiency?: string;
  evidence?: string;
  snippet?: string;
  reason?: string;
}

/**
 * Parses the LLM JSON response into ProficiencyResult[].
 * Returns null if the response is not valid JSON or doesn't match expected shape.
 */
function parseLLMResponse(content: string): ProficiencyResult[] | null {
  try {
    const data = JSON.parse(content);

    // The LLM might return { skills: [...] } or just [...]
    let skillsArray: RawLLMProficiency[];

    if (Array.isArray(data)) {
      skillsArray = data;
    } else if (data && Array.isArray(data.skills)) {
      skillsArray = data.skills;
    } else if (data && Array.isArray(data.results)) {
      skillsArray = data.results;
    } else {
      return null;
    }

    if (skillsArray.length === 0) {
      return null;
    }

    const results: ProficiencyResult[] = [];

    for (const item of skillsArray) {
      const skillName = item.skillName || item.skill_name || item.name;
      if (!skillName || typeof skillName !== 'string') continue;

      const level = normalizeLevel(item.level || item.proficiency);
      const evidence = item.evidence || item.snippet || item.reason || '';

      results.push({
        skillName: skillName.trim(),
        level,
        evidence: typeof evidence === 'string' ? evidence.trim() : '',
        confidence: 0.9,
      });
    }

    return results.length > 0 ? results : null;
  } catch {
    // JSON parse failed — malformed response
    return null;
  }
}

/**
 * Normalizes a level string from LLM to one of the valid proficiency levels.
 */
function normalizeLevel(value: unknown): 'beginner' | 'intermediate' | 'expert' {
  if (typeof value !== 'string') return 'intermediate';
  const lower = value.toLowerCase().trim();
  if (lower === 'expert' || lower === 'advanced' || lower === 'senior') {
    return 'expert';
  }
  if (lower === 'beginner' || lower === 'basic' || lower === 'novice' || lower === 'junior') {
    return 'beginner';
  }
  return 'intermediate';
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Maps LLM results to the requested skill list, filling in missing skills
 * with local analysis.
 */
function mapResultsToSkills(
  requestedSkills: string[],
  llmResults: ProficiencyResult[]
): ProficiencyResult[] {
  const resultMap = new Map<string, ProficiencyResult>();

  // Index LLM results by skill name (case insensitive)
  for (const result of llmResults) {
    resultMap.set(result.skillName.toLowerCase(), result);
  }

  // Build final results, using LLM result when available or defaulting
  return requestedSkills.map((skill) => {
    const match = resultMap.get(skill.toLowerCase());
    if (match) {
      return {
        ...match,
        skillName: skill, // Use the original requested name
      };
    }

    // Skill wasn't in LLM response — default to intermediate
    return {
      skillName: skill,
      level: 'intermediate' as const,
      evidence: 'No specific proficiency indicators found in context',
      confidence: 0.5,
    };
  });
}

/**
 * Extracts text context surrounding a skill mention in the resume.
 * Returns the full resume text if the skill is not found (to catch
 * indirect mentions).
 */
function extractSkillContext(skill: string, resumeText: string): string {
  const textLower = resumeText.toLowerCase();
  const skillLower = skill.toLowerCase();
  const index = textLower.indexOf(skillLower);

  if (index === -1) {
    // Skill not found literally — use full text for context
    // Limit to avoid excessively long strings
    return resumeText.substring(0, 2000);
  }

  // Extract 300 chars around the skill mention
  const start = Math.max(0, index - 150);
  const end = Math.min(resumeText.length, index + skill.length + 150);
  return resumeText.substring(start, end);
}

/**
 * Finds a text snippet around an indicator keyword for evidence.
 */
function findEvidenceSnippet(text: string, indicator: string): string {
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(indicator);

  if (index === -1) return indicator;

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + indicator.length + 40);
  return text.substring(start, end).trim();
}
