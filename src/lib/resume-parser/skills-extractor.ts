/**
 * Skills Extractor for Resume Parsing
 *
 * Extracts skills from multiple resume sections with proficiency assignment,
 * handles comma-separated, pipe-separated, bullet-point, and categorized skill lists.
 * Canonicalizes skill names via the skills taxonomy lookup.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7
 */

import type { SectionType } from './section-detector';
import { canonicalize, SKILLS_TAXONOMY } from '../nlp/skills-taxonomy';

export interface ExtractedSkill {
  name: string;          // canonical name from taxonomy (or original if not found)
  rawName: string;       // original extracted text
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  source: SectionType;   // which section it was found in
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
}

export interface SkillsExtractionInput {
  skillsLines: string[];
  certificationLines: string[];
  experienceLines: string[];
  projectLines: string[];
}

const MAX_SKILLS = 100;
const MAX_CERTIFICATIONS = 50;

/**
 * Patterns indicating quantified achievements.
 * Used to determine "advanced" proficiency when a skill appears
 * in experience or project lines alongside these indicators.
 */
const QUANTIFIED_ACHIEVEMENT_PATTERN =
  /(\d+%|\d+\s*percent|\$\d+|\d+\s*(users|clients|customers|requests|transactions|teams|members|projects|apps|applications|services|endpoints|servers|deployments))|((increased|reduced|improved|decreased|grew|boosted|accelerated|optimized|enhanced|saved|generated|delivered|achieved|managed|led|scaled)\s+.*?\d+)/i;

/**
 * Proficiency level hierarchy for promotion logic.
 */
const PROFICIENCY_RANK: Record<ExtractedSkill['proficiencyLevel'], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Parse skill tokens from lines using multiple format detection:
 * - Comma-separated: "JavaScript, TypeScript, React, Python"
 * - Pipe-separated: "JavaScript | TypeScript | React"
 * - Bullet-point lists: lines starting with •, -, *
 * - Categorized: "Languages: Python, Java, Go"
 */
function parseSkillsFromLines(lines: string[]): string[] {
  const skills: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Skip header lines (section headers that are all uppercase or end with underline-like chars)
    if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length < 50) continue;

    // Check for categorized format: "Category: item1, item2, item3"
    const categorizedMatch = trimmed.match(/^([A-Za-z\s/&]+):\s*(.+)/);
    if (categorizedMatch) {
      const items = parseDelimitedItems(categorizedMatch[2]);
      skills.push(...items);
      continue;
    }

    // Check for bullet-point format
    const bulletMatch = trimmed.match(/^[•\-*]\s+(.+)/);
    if (bulletMatch) {
      // A bullet could contain a comma/pipe separated list itself
      const bulletContent = bulletMatch[1].trim();
      if (bulletContent.includes(',') || bulletContent.includes('|')) {
        skills.push(...parseDelimitedItems(bulletContent));
      } else {
        const cleaned = cleanSkillToken(bulletContent);
        if (cleaned.length > 0 && isValidSkillToken(cleaned)) {
          skills.push(cleaned);
        }
      }
      continue;
    }

    // Check for pipe-separated
    if (trimmed.includes('|')) {
      skills.push(...parseDelimitedItems(trimmed));
      continue;
    }

    // Check for comma-separated (at least one comma)
    if (trimmed.includes(',')) {
      skills.push(...parseDelimitedItems(trimmed));
      continue;
    }

    // Single skill token on a line
    const cleaned = cleanSkillToken(trimmed);
    if (cleaned.length > 0 && cleaned.length < 60 && isValidSkillToken(cleaned)) {
      skills.push(cleaned);
    }
  }

  return skills;
}

/**
 * Parse delimited items (comma or pipe separated).
 */
function parseDelimitedItems(text: string): string[] {
  // Split by pipe or comma
  const items = text.split(/[|,]/).map(s => cleanSkillToken(s.trim()));
  return items.filter(item => item.length > 0 && item.length < 60 && isValidSkillToken(item));
}

/**
 * Clean a skill token by removing leading/trailing non-essential characters.
 */
function cleanSkillToken(token: string): string {
  return token
    .replace(/^[•\-*\d.)\]]+\s*/, '') // remove bullet chars, numbered prefixes
    .replace(/[;.]+$/, '')             // remove trailing semicolons/periods
    .trim();
}

/**
 * Validates whether a token looks like a legitimate skill name.
 * Rejects: URLs, dates, long sentences, organization names, file paths, etc.
 */
function isValidSkillToken(token: string): boolean {
  if (token.length < 2 || token.length > 50) return false;

  // Reject URLs and file paths
  if (/^https?:\/\//i.test(token)) return false;
  if (/\.(com|org|net|io|app|dev|edu|gov)\b/i.test(token) && token.includes('/')) return false;
  if (/^\/|^\\|^[a-z]:\\/i.test(token)) return false;

  // Reject pure dates and year ranges
  if (/^\d{4}\s*[-–—]\s*(\d{4}|[Pp]resent|[Cc]urrent)$/.test(token)) return false;
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(token) && /\d{4}/.test(token)) return false;
  if (/^\d{4}$/.test(token)) return false;
  if (/^-\s*(Present|Current|\d{4})$/i.test(token)) return false;

  // Reject tokens that are mostly numbers
  const digits = token.replace(/[^0-9]/g, '').length;
  if (digits > token.length * 0.6) return false;

  // Reject tokens that look like sentences (too many words, lowercase start)
  const words = token.split(/\s+/);
  if (words.length > 5) return false;

  // Reject common non-skill patterns
  if (/^(and|or|the|with|for|from|using|featuring|including|focused|based|driven)\b/i.test(token)) return false;
  if (/\b(university|college|institute|school|academy)\b/i.test(token)) return false;
  if (/\b(club|organization|association|society|committee)\b/i.test(token)) return false;
  if (/\b(province|city|country|manila|philippines|district)\b/i.test(token)) return false;

  return true;
}

/**
 * Build a set of all known skill names (canonical + synonyms) for scanning prose.
 * Returns a map from lowercase name → canonical name.
 */
function buildSkillScanMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of SKILLS_TAXONOMY) {
    map.set(entry.canonical.toLowerCase(), entry.canonical);
    for (const synonym of entry.synonyms) {
      map.set(synonym.toLowerCase(), entry.canonical);
    }
  }
  return map;
}

const SKILL_SCAN_MAP = buildSkillScanMap();

/**
 * Scan prose/sentence lines for known skill mentions (from taxonomy).
 * Returns array of { rawName, canonical } found.
 */
function scanLinesForSkills(lines: string[]): Array<{ rawName: string; canonical: string }> {
  const found: Array<{ rawName: string; canonical: string }> = [];
  const seen = new Set<string>();

  const joinedText = lines.join(' ').toLowerCase();

  for (const [name, canonical] of SKILL_SCAN_MAP) {
    if (seen.has(canonical.toLowerCase())) continue;
    // Use word-boundary-like check to avoid false positives on very short names
    if (name.length <= 1) continue;

    if (joinedText.includes(name)) {
      seen.add(canonical.toLowerCase());
      found.push({ rawName: name, canonical });
    }
  }

  return found;
}

/**
 * Check if a set of lines contain quantified achievements near a given skill name.
 */
function hasQuantifiedAchievement(lines: string[], skillName: string): boolean {
  const lowerSkill = skillName.toLowerCase();

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    // Skill must appear in the line AND line must have a quantified achievement
    if (lowerLine.includes(lowerSkill) && QUANTIFIED_ACHIEVEMENT_PATTERN.test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract skills with proficiency assignment.
 *
 * Algorithm:
 * 1. Parse skill tokens from skillsLines (intermediate level)
 * 2. Parse skill tokens from experienceLines and projectLines
 * 3. Parse skill tokens from certificationLines (beginner level)
 * 4. Assign proficiency based on source section and quantified achievements
 * 5. Promote proficiency when skill appears in multiple sections (highest wins)
 * 6. Canonicalize skill names via taxonomy
 * 7. Cap at MAX_SKILLS
 */
export function extractSkills(input: SkillsExtractionInput): ExtractedSkill[] {
  const { skillsLines, certificationLines, experienceLines, projectLines } = input;

  // Map: canonical name → best skill entry
  const skillMap = new Map<string, ExtractedSkill>();

  // 1. Parse skills from the dedicated skills section → intermediate
  const skillsTokens = parseSkillsFromLines(skillsLines);
  for (const raw of skillsTokens) {
    const canonical = canonicalize(raw);
    const key = canonical.toLowerCase();
    const existing = skillMap.get(key);

    if (!existing || PROFICIENCY_RANK['intermediate'] > PROFICIENCY_RANK[existing.proficiencyLevel]) {
      skillMap.set(key, {
        name: canonical,
        rawName: existing?.rawName ?? raw,
        proficiencyLevel: 'intermediate',
        source: 'skills',
      });
    }
  }

  // 2. Scan experience and project lines for known skills → check for advanced
  const expProjectLines = [...experienceLines, ...projectLines];
  const expProjectSkills = scanLinesForSkills(expProjectLines);

  for (const { rawName, canonical } of expProjectSkills) {
    const key = canonical.toLowerCase();

    // Determine proficiency: advanced if quantified achievement present
    const isAdvanced = hasQuantifiedAchievement(expProjectLines, rawName) ||
      hasQuantifiedAchievement(expProjectLines, canonical);
    const proficiency: ExtractedSkill['proficiencyLevel'] = isAdvanced ? 'advanced' : 'intermediate';

    const existing = skillMap.get(key);
    if (!existing || PROFICIENCY_RANK[proficiency] > PROFICIENCY_RANK[existing.proficiencyLevel]) {
      skillMap.set(key, {
        name: canonical,
        rawName: existing?.rawName ?? rawName,
        proficiencyLevel: proficiency,
        source: 'experience',
      });
    }
  }

  // Also parse explicit skill lists within experience/project lines (e.g., "Technologies: React, Node.js")
  // But ONLY parse categorized format lines (with ":" prefix) — not all comma-separated content
  for (const line of expProjectLines) {
    const trimmed = line.trim();
    const categorizedMatch = trimmed.match(/^(?:Technologies|Tech(?:nology)?|Stack|Tools|Built with|Languages|Frameworks)\s*:\s*(.+)/i);
    if (categorizedMatch) {
      const items = categorizedMatch[1].split(/[|,]/).map(s => cleanSkillToken(s.trim())).filter(item => item.length > 0 && isValidSkillToken(item));
      for (const raw of items) {
        const canonical = canonicalize(raw);
        const key = canonical.toLowerCase();

        const isAdvanced = hasQuantifiedAchievement(expProjectLines, raw) ||
          hasQuantifiedAchievement(expProjectLines, canonical);
        const proficiency: ExtractedSkill['proficiencyLevel'] = isAdvanced ? 'advanced' : 'intermediate';

        const existing = skillMap.get(key);
        if (!existing || PROFICIENCY_RANK[proficiency] > PROFICIENCY_RANK[existing.proficiencyLevel]) {
          skillMap.set(key, {
            name: canonical,
            rawName: existing?.rawName ?? raw,
            proficiencyLevel: proficiency,
            source: 'experience',
          });
        }
      }
    }
  }

  // Additionally: promote skills already in the map if they appear in experience/project lines
  // with quantified achievements
  for (const [key, skill] of skillMap) {
    if (skill.proficiencyLevel === 'advanced') continue;

    // Check if this skill (by raw name or canonical) appears in experience/project lines
    if (
      hasQuantifiedAchievement(expProjectLines, skill.rawName) ||
      hasQuantifiedAchievement(expProjectLines, skill.name)
    ) {
      skillMap.set(key, { ...skill, proficiencyLevel: 'advanced', source: 'experience' });
    }
  }

  // 3. Scan certification lines for known skills → beginner (lowest priority)
  const certScannedSkills = scanLinesForSkills(certificationLines);
  for (const { rawName, canonical } of certScannedSkills) {
    const key = canonical.toLowerCase();
    const existing = skillMap.get(key);

    // Only add if not already present (beginner is lowest, never promotes)
    if (!existing) {
      skillMap.set(key, {
        name: canonical,
        rawName,
        proficiencyLevel: 'beginner',
        source: 'certifications',
      });
    }
  }

  // Also parse explicit skill lists within certification lines — only categorized format
  for (const line of certificationLines) {
    const trimmed = line.trim();
    const categorizedMatch = trimmed.match(/^(?:Technologies|Tech(?:nology)?|Stack|Tools|Skills)\s*:\s*(.+)/i);
    if (categorizedMatch) {
      const items = categorizedMatch[1].split(/[|,]/).map(s => cleanSkillToken(s.trim())).filter(item => item.length > 0 && isValidSkillToken(item));
      for (const raw of items) {
        const canonical = canonicalize(raw);
        const key = canonical.toLowerCase();
        const existing = skillMap.get(key);

        if (!existing) {
          skillMap.set(key, {
            name: canonical,
            rawName: raw,
            proficiencyLevel: 'beginner',
            source: 'certifications',
          });
        }
      }
    }
  }

  // 4. Cap at MAX_SKILLS
  const results = Array.from(skillMap.values());
  return results.slice(0, MAX_SKILLS);
}

/**
 * Extract certification entries from lines.
 *
 * Parsing strategy:
 * - Each non-empty line is treated as a potential certification entry
 * - Validate that it looks like a certification (not an education entry, project description, URL, etc.)
 * - Try to detect issuer after " by ", " from ", " - " delimiter
 * - Try to detect date (year pattern) at end of line
 * - If no issuer/date found, use empty string
 *
 * Cap at MAX_CERTIFICATIONS entries.
 */
export function extractCertifications(lines: string[]): CertificationEntry[] {
  const entries: CertificationEntry[] = [];

  for (const line of lines) {
    if (entries.length >= MAX_CERTIFICATIONS) break;

    let trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Skip header lines
    if (/^[A-Z\s]+$/.test(trimmed) && trimmed.length < 50) continue;

    // Remove bullet-point prefix
    trimmed = trimmed.replace(/^[•\-*\d.)\]]+\s*/, '').trim();
    if (trimmed.length <= 3) continue;

    // Reject items that are clearly not certifications
    if (!isValidCertificationEntry(trimmed)) continue;

    let name = trimmed;
    let issuer = '';
    let date = '';

    // Try to extract year from end of line (e.g., "2023", "2020", "(2022)")
    const yearMatch = trimmed.match(/[(\s,]?((?:19|20)\d{2})\s*\)?$/);
    if (yearMatch) {
      date = yearMatch[1];
      name = trimmed.slice(0, yearMatch.index).trim();
      // Remove trailing comma/dash from name after removing date
      name = name.replace(/[,\-|]\s*$/, '').trim();
    }

    // Try to extract issuer using delimiters: " by ", " from ", " - "
    const issuerPatterns = [
      /\s+by\s+(.+)/i,
      /\s+from\s+(.+)/i,
      /\s+-\s+(.+)/,
      /\s+\|\s+(.+)/,
    ];

    for (const pattern of issuerPatterns) {
      const match = name.match(pattern);
      if (match) {
        issuer = match[1].trim();
        name = name.slice(0, match.index).trim();
        break;
      }
    }

    // Clean up remaining artifacts
    name = name.replace(/[,\-|]\s*$/, '').trim();

    if (name.length > 0) {
      entries.push({ name, issuer, date });
    }
  }

  return entries;
}

/**
 * Validates whether a line looks like a legitimate certification entry.
 * Rejects: URLs, education entries, project descriptions, dates, org names, achievement text.
 */
function isValidCertificationEntry(text: string): boolean {
  // Reject URLs
  if (/^https?:\/\//i.test(text)) return false;
  if (/\.(com|org|net|io|app|dev|edu)\//i.test(text)) return false;

  // Reject pure dates
  if (/^\d{4}\s*[-–—]\s*(\d{4}|Present|Current)$/i.test(text)) return false;
  if (/^-\s*(Present|Current|\d{4})$/i.test(text)) return false;

  // Reject education-like entries (degree keywords + institution patterns)
  // Only reject if the entry has BOTH a degree keyword AND looks like a degree (not just contains "master")
  if (/\b(bachelor'?s?|ph\.?d\.?|b\.?s\.?\b|m\.?s\.?\b|b\.?a\.?\b|associate'?s?|diploma|doctorate)\b/i.test(text)) return false;
  if (/\bmaster'?s?\s+(of|in|degree)\b/i.test(text)) return false;
  if (/\b(university|college|institute|school|academy)\b/i.test(text) && !/\bcertif/i.test(text)) return false;

  // Reject items that look like organization/club names (without cert-like keywords)
  if (/\b(club|organization|association|society|committee|chapter|rotary|rotaract)\b/i.test(text) && !/\bcertif/i.test(text)) return false;

  // Reject achievement-like entries
  if (/\b(with honors|cum laude|magna|summa|dean's list|valedictorian|salutatorian)\b/i.test(text)) return false;

  // Reject province/location-only entries
  if (/\b(province|city|district|manila|philippines|metro)\b/i.test(text) && text.split(/\s+/).length < 4) return false;

  // Reject entries that are too long (likely project descriptions)
  if (text.length > 150) return false;

  // Reject entries that start with action verbs (likely experience highlights)
  if (/^(developed|built|created|designed|implemented|managed|led|collected|automated|increased|reduced|improved)\b/i.test(text)) return false;

  return true;
}
