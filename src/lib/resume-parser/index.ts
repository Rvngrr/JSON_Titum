/**
 * Resume Parser Orchestrator
 *
 * Combines all extractors into a single parse pipeline:
 * section detection → per-section extraction → taxonomy canonicalization → optional AI enhancement.
 *
 * Ensures output is JSON-safe, round-trip consistent, trimmed, and within max limits.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { detectSections, getSectionContent } from './section-detector';
import { extractExperience } from './experience-extractor';
import type { WorkExperienceEntry } from './experience-extractor';
import { extractEducation } from './education-extractor';
import type { EducationEntry } from './education-extractor';
import { extractSkills, extractCertifications } from './skills-extractor';
import type { ExtractedSkill, CertificationEntry } from './skills-extractor';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ProjectEntry {
  name: string;
  description: string;
  technologies: string[];
  outcome: string | null;
}

export interface StructuredProfile {
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  skills: ExtractedSkill[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  achievements: string[];
}

export interface ParseOptions {
  enableEnhancement?: boolean; // default: true
  enhancementTimeout?: number; // default: 10000ms
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_EXPERIENCE = 20;
const MAX_EDUCATION = 20;
const MAX_SKILLS = 100;
const MAX_CERTIFICATIONS = 50;

/**
 * Regex matching Unicode control characters (Cc and Cf categories)
 * EXCEPT newline (U+000A). Used for sanitization.
 */
const CONTROL_CHAR_REGEX = /[\x00-\x09\x0B-\x1F\x7F\u0080-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g;

// ─── Sanitization Helpers ───────────────────────────────────────────────────

/**
 * Strip control characters from a string. Keeps \n (U+000A) only when
 * isHighlight is true (bullet point highlights may contain newlines).
 */
function stripControlChars(str: string, preserveNewlines: boolean): string {
  if (preserveNewlines) {
    return str.replace(CONTROL_CHAR_REGEX, '');
  }
  // Also strip newlines for non-highlight fields
  return str.replace(/[\x00-\x1F\x7F\u0080-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');
}

/**
 * Sanitize a string: trim and strip control characters.
 */
function sanitizeString(str: string | undefined | null, preserveNewlines = false): string {
  if (str == null) return '';
  const trimmed = str.trim();
  return stripControlChars(trimmed, preserveNewlines);
}



// ─── Project Parsing ────────────────────────────────────────────────────────

/**
 * Parse project entries from project section lines.
 *
 * Strategy:
 * - Lines that don't start with a bullet are treated as project names
 * - Subsequent bullet lines are descriptions/details
 * - Technologies are extracted from "Technologies:" or "Tech:" patterns
 */
function parseProjects(lines: string[]): ProjectEntry[] {
  const projects: ProjectEntry[] = [];
  let current: { name: string; descLines: string[]; technologies: string[]; outcome: string | null } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Skip header lines (uppercase section headers)
    if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length < 50) continue;

    const isBullet = /^\s*[•\-*]|\d+[.)]\s/.test(trimmed);

    if (!isBullet) {
      // Non-bullet line: potential new project name
      if (current) {
        projects.push(finalizeProject(current));
      }
      current = { name: trimmed, descLines: [], technologies: [], outcome: null };
    } else if (current) {
      // Bullet line belongs to current project
      const cleaned = trimmed.replace(/^\s*(?:[•\-*]|\d+[.)]\s?)\s*/, '').trim();

      // Check for technologies pattern
      const techMatch = cleaned.match(/^(?:Technologies|Tech(?:nology)?|Stack|Tools|Built with)\s*:\s*(.+)/i);
      if (techMatch) {
        const techs = techMatch[1].split(/[,|]/).map(t => t.trim()).filter(t => t.length > 0);
        current.technologies.push(...techs);
      }
      // Check for outcome pattern
      else if (/^(?:Outcome|Result|Impact|Achievement)\s*:/i.test(cleaned)) {
        current.outcome = cleaned.replace(/^(?:Outcome|Result|Impact|Achievement)\s*:\s*/i, '').trim();
      } else {
        current.descLines.push(cleaned);
      }
    }
  }

  // Don't forget the last project
  if (current) {
    projects.push(finalizeProject(current));
  }

  return projects;
}

function finalizeProject(raw: { name: string; descLines: string[]; technologies: string[]; outcome: string | null }): ProjectEntry {
  return {
    name: raw.name,
    description: raw.descLines.join(' ').trim(),
    technologies: raw.technologies,
    outcome: raw.outcome,
  };
}

// ─── Achievements Parsing ───────────────────────────────────────────────────

/**
 * Parse achievements from section lines.
 * Each bullet or non-empty line is an achievement.
 */
function parseAchievements(lines: string[]): string[] {
  const achievements: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Skip header lines
    if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length < 50) continue;

    // Remove bullet prefix
    const cleaned = trimmed.replace(/^\s*(?:[•\-*]|\d+[.)]\s?)\s*/, '').trim();
    if (cleaned.length > 0) {
      achievements.push(cleaned);
    }
  }

  return achievements;
}

// ─── Sanitization Pipeline ──────────────────────────────────────────────────

/**
 * Sanitize a WorkExperienceEntry for JSON safety.
 */
function sanitizeExperience(entry: WorkExperienceEntry): WorkExperienceEntry {
  return {
    title: sanitizeString(entry.title),
    company: sanitizeString(entry.company),
    startDate: sanitizeString(entry.startDate),
    endDate: sanitizeString(entry.endDate),
    isCurrent: Boolean(entry.isCurrent),
    highlights: entry.highlights.map(h => sanitizeString(h, true)),
  };
}

/**
 * Sanitize an EducationEntry for JSON safety.
 */
function sanitizeEducation(entry: EducationEntry): EducationEntry {
  return {
    degree: sanitizeString(entry.degree),
    institution: sanitizeString(entry.institution),
    fieldOfStudy: entry.fieldOfStudy != null ? sanitizeString(entry.fieldOfStudy) : null,
    graduationYear: sanitizeString(entry.graduationYear),
  };
}

/**
 * Sanitize an ExtractedSkill for JSON safety.
 */
function sanitizeSkill(skill: ExtractedSkill): ExtractedSkill {
  return {
    name: sanitizeString(skill.name),
    rawName: sanitizeString(skill.rawName),
    proficiencyLevel: skill.proficiencyLevel,
    source: skill.source,
  };
}

/**
 * Sanitize a CertificationEntry for JSON safety.
 */
function sanitizeCertification(entry: CertificationEntry): CertificationEntry {
  return {
    name: sanitizeString(entry.name),
    issuer: sanitizeString(entry.issuer),
    date: sanitizeString(entry.date),
  };
}

/**
 * Sanitize a ProjectEntry for JSON safety.
 */
function sanitizeProject(project: ProjectEntry): ProjectEntry {
  return {
    name: sanitizeString(project.name),
    description: sanitizeString(project.description),
    technologies: project.technologies.map(t => sanitizeString(t)),
    outcome: project.outcome != null ? sanitizeString(project.outcome) : null,
  };
}

/**
 * Sanitize the entire StructuredProfile.
 * Ensures:
 * - All strings are trimmed and control chars stripped
 * - No undefined values (replaced with null)
 * - No Date objects, functions, Infinity, NaN
 * - Max limits enforced
 */
function sanitizeProfile(profile: StructuredProfile): StructuredProfile {
  return {
    experience: profile.experience.slice(0, MAX_EXPERIENCE).map(sanitizeExperience),
    education: profile.education.slice(0, MAX_EDUCATION).map(sanitizeEducation),
    skills: profile.skills.slice(0, MAX_SKILLS).map(sanitizeSkill),
    certifications: profile.certifications.slice(0, MAX_CERTIFICATIONS).map(sanitizeCertification),
    projects: profile.projects.map(sanitizeProject),
    achievements: profile.achievements.map(a => sanitizeString(a)),
  };
}

/**
 * Validate that a profile is round-trip safe.
 * If not, throws an error (Requirement 8.6).
 */
function validateRoundTrip(profile: StructuredProfile): void {
  try {
    const serialized = JSON.stringify(profile);
    const deserialized = JSON.parse(serialized);
    const reSerialized = JSON.stringify(deserialized);

    if (serialized !== reSerialized) {
      throw new Error('Profile serialization is not round-trip consistent');
    }
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('circular') || error.message.includes('Converting'))) {
      throw new Error(`Profile serialization failed: ${error.message}`);
    }
    throw error;
  }
}

// ─── Main Orchestrator Functions ────────────────────────────────────────────

/**
 * Parse resume text using local-only processing (no AI).
 *
 * Algorithm:
 * 1. detectSections(text) to identify resume sections
 * 2. getSectionContent for each section type
 * 3. extractExperience(experienceLines)
 * 4. extractEducation(educationLines)
 * 5. extractSkills({ skillsLines, certificationLines, experienceLines, projectLines })
 * 6. extractCertifications(certificationLines)
 * 7. parseProjects(projectLines)
 * 8. parseAchievements(achievementLines)
 * 9. Sanitize all output
 * 10. Enforce max limits
 * 11. Validate round-trip consistency
 */
export function parseResumeLocal(text: string): StructuredProfile {
  // Step 1: Detect sections
  const sectionResult = detectSections(text);

  // Step 2: Get content for each section type
  const experienceLines = getSectionContent(sectionResult, 'experience');
  const educationLines = getSectionContent(sectionResult, 'education');
  const skillsLines = getSectionContent(sectionResult, 'skills');
  const certificationLines = getSectionContent(sectionResult, 'certifications');
  const projectLines = getSectionContent(sectionResult, 'projects');
  const achievementLines = getSectionContent(sectionResult, 'achievements');

  // Step 3: Extract experience
  const experience = extractExperience(experienceLines);

  // Step 4: Extract education
  const education = extractEducation(educationLines);

  // Step 5: Extract skills (uses multiple section inputs for proficiency assignment)
  const skills = extractSkills({
    skillsLines,
    certificationLines,
    experienceLines,
    projectLines,
  });

  // Step 6: Extract certifications
  const certifications = extractCertifications(certificationLines);

  // Step 7: Parse projects
  const projects = parseProjects(projectLines);

  // Step 8: Parse achievements
  const achievements = parseAchievements(achievementLines);

  // Step 9-10: Sanitize output (also enforces max limits)
  const profile = sanitizeProfile({
    experience,
    education,
    skills,
    certifications,
    projects,
    achievements,
  });

  // Step 11: Validate round-trip consistency (Requirement 8.5, 8.6)
  validateRoundTrip(profile);

  return profile;
}

/**
 * Parse resume text into structured profile with optional AI enhancement.
 *
 * Algorithm:
 * 1. Call parseResumeLocal for local extraction
 * 2. If enhancement enabled, attempt AI enhancement (stub for now)
 * 3. Merge AI results additively (fill empty fields only, never overwrite)
 * 4. Return final profile
 *
 * Note: AI enhancement is a stub that returns local results since the
 * enhancement orchestrator isn't built yet (Task 7.2).
 */
export async function parseResume(
  text: string,
  options?: ParseOptions
): Promise<StructuredProfile> {
  const opts: Required<ParseOptions> = {
    enableEnhancement: options?.enableEnhancement ?? true,
    enhancementTimeout: options?.enhancementTimeout ?? 10000,
  };

  // Step 1: Local extraction (always runs first)
  const localProfile = parseResumeLocal(text);

  // Step 2: Optional AI enhancement
  if (opts.enableEnhancement) {
    try {
      const enhanced = await enhanceProfile(localProfile, text, opts.enhancementTimeout);
      if (enhanced) {
        // Step 3: Additive merge — only fill empty/null fields
        return mergeProfiles(localProfile, enhanced);
      }
    } catch {
      // AI enhancement failure is silently absorbed (Requirement 7.6)
      // Return local results unchanged
    }
  }

  return localProfile;
}

// ─── AI Enhancement Stub ────────────────────────────────────────────────────

/**
 * AI enhancement stub. Returns null (no enhancement available).
 * Will be replaced when the Enhancement Orchestrator is built (Task 7.2).
 */
async function enhanceProfile(
  _localProfile: StructuredProfile,
  _text: string,
  _timeout: number
): Promise<StructuredProfile | null> {
  // Enhancement orchestrator not yet built — return null to indicate no enhancement
  return null;
}

/**
 * Merge an AI-enhanced profile into the local profile additively.
 * Only fills fields where the local extraction produced empty/null values.
 * Never overwrites non-empty local values (Requirement 7.4).
 */
function mergeProfiles(local: StructuredProfile, enhanced: StructuredProfile): StructuredProfile {
  return {
    experience: mergeExperience(local.experience, enhanced.experience),
    education: mergeEducation(local.education, enhanced.education),
    skills: mergeSkills(local.skills, enhanced.skills),
    certifications: mergeCertifications(local.certifications, enhanced.certifications),
    projects: local.projects.length > 0 ? local.projects : enhanced.projects,
    achievements: local.achievements.length > 0 ? local.achievements : enhanced.achievements,
  };
}

/**
 * Merge experience entries: fill empty title/company from enhanced.
 */
function mergeExperience(local: WorkExperienceEntry[], enhanced: WorkExperienceEntry[]): WorkExperienceEntry[] {
  if (local.length === 0 && enhanced.length > 0) {
    return enhanced.slice(0, MAX_EXPERIENCE);
  }

  return local.map((entry, i) => {
    const enhancedEntry = enhanced[i];
    if (!enhancedEntry) return entry;

    return {
      ...entry,
      title: entry.title || enhancedEntry.title,
      company: entry.company || enhancedEntry.company,
      highlights: entry.highlights.length > 0 ? entry.highlights : enhancedEntry.highlights,
    };
  });
}

/**
 * Merge education entries: fill empty degree/institution from enhanced.
 */
function mergeEducation(local: EducationEntry[], enhanced: EducationEntry[]): EducationEntry[] {
  if (local.length === 0 && enhanced.length > 0) {
    return enhanced.slice(0, MAX_EDUCATION);
  }

  return local.map((entry, i) => {
    const enhancedEntry = enhanced[i];
    if (!enhancedEntry) return entry;

    return {
      ...entry,
      degree: entry.degree || enhancedEntry.degree,
      institution: entry.institution || enhancedEntry.institution,
      fieldOfStudy: entry.fieldOfStudy ?? enhancedEntry.fieldOfStudy,
    };
  });
}

/**
 * Merge skills: add AI-detected skills not already present locally.
 */
function mergeSkills(local: ExtractedSkill[], enhanced: ExtractedSkill[]): ExtractedSkill[] {
  const localNames = new Set(local.map(s => s.name.toLowerCase()));
  const newSkills = enhanced.filter(s => !localNames.has(s.name.toLowerCase()));
  const merged = [...local, ...newSkills];
  return merged.slice(0, MAX_SKILLS);
}

/**
 * Merge certifications: add AI-detected certs not already present locally.
 */
function mergeCertifications(local: CertificationEntry[], enhanced: CertificationEntry[]): CertificationEntry[] {
  const localNames = new Set(local.map(c => c.name.toLowerCase()));
  const newCerts = enhanced.filter(c => !localNames.has(c.name.toLowerCase()));
  const merged = [...local, ...newCerts];
  return merged.slice(0, MAX_CERTIFICATIONS);
}

// ─── Re-exports for convenience ────────────────────────────────────────────

export type { WorkExperienceEntry } from './experience-extractor';
export type { EducationEntry } from './education-extractor';
export type { ExtractedSkill, CertificationEntry } from './skills-extractor';
