/**
 * Section Detector for Resume Parsing
 *
 * Identifies logical section boundaries in resume text using header pattern
 * recognition and layout analysis. Uses a 5-priority scoring system for
 * header detection and maps headers to section types via keyword aliases.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

export type SectionType =
  | 'header-contact'
  | 'experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'projects'
  | 'achievements'
  | 'unstructured';

export interface DetectedSection {
  type: SectionType;
  startLine: number;
  endLine: number;
  headerLine: string;
  confidence: number; // 1-5 based on priority match (1 = highest confidence)
  lines: string[];
}

export interface SectionDetectionResult {
  sections: DetectedSection[];
  hasStructure: boolean;
}

interface HeaderCandidate {
  lineIndex: number;
  priority: number; // 1 = highest priority
  text: string;
  sectionType: SectionType;
}

/**
 * Section type keyword aliases for case-insensitive matching.
 * Each key is a SectionType, value is an array of keywords that map to it.
 */
const SECTION_KEYWORDS: Record<Exclude<SectionType, 'header-contact' | 'unstructured'>, string[]> = {
  experience: ['experience', 'work experience', 'employment', 'internships', 'leadership'],
  education: ['education', 'academic background', 'qualifications'],
  skills: ['skills', 'technical skills', 'core competencies', 'programming'],
  certifications: ['certifications', 'certificates', 'training', 'seminars'],
  projects: ['projects', 'portfolio', 'personal projects'],
  achievements: ['achievements', 'awards', 'honors'],
};

/**
 * Pre-built reverse lookup: keyword (lowercase) → SectionType
 */
const KEYWORD_TO_SECTION: Map<string, SectionType> = new Map();
for (const [sectionType, keywords] of Object.entries(SECTION_KEYWORDS)) {
  for (const keyword of keywords) {
    KEYWORD_TO_SECTION.set(keyword.toLowerCase(), sectionType as SectionType);
  }
}

/**
 * Check if a line is all uppercase (ignoring non-letter chars).
 * Must contain at least one letter.
 */
function isUppercase(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

/**
 * Check if a line is an underline (composed of dashes, equals, or underscores).
 */
function isUnderline(line: string): boolean {
  if (line.length === 0) return false;
  return /^[-=_]{2,}$/.test(line);
}

/**
 * Check if a line is standalone — not embedded in a sentence.
 * Standalone means it doesn't start with lowercase or common sentence connectors,
 * and doesn't end with a period that suggests it's a sentence.
 */
function isStandalone(line: string): boolean {
  if (line.length === 0) return false;
  // If it ends with a period and has more than 3 words, likely a sentence
  const words = line.split(/\s+/);
  if (line.endsWith('.') && words.length > 3) return false;
  // If it starts with lowercase, likely continuation of a sentence
  if (/^[a-z]/.test(line)) return false;
  return true;
}

/**
 * Check if a line is title-case (first letter of significant words capitalized).
 * Must start with uppercase and contain at least one letter.
 */
function isTitleCase(line: string): boolean {
  const cleaned = line.replace(/:$/, '').trim();
  if (cleaned.length === 0) return false;
  const letters = cleaned.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;
  // Must start with uppercase
  if (!/^[A-Z]/.test(cleaned)) return false;
  // Should not be all uppercase (that's a different pattern)
  if (letters === letters.toUpperCase() && letters.length > 1) return false;
  return true;
}

/**
 * Check if a line contains a section keyword.
 * Returns the matched section type or null.
 */
function matchSectionKeyword(line: string): SectionType | null {
  const normalized = line.toLowerCase().replace(/:$/, '').trim();

  // First try exact match against full keywords
  for (const [keyword, sectionType] of KEYWORD_TO_SECTION) {
    if (normalized === keyword) {
      return sectionType;
    }
  }

  // Then try containment match for partial/inline matches
  for (const [keyword, sectionType] of KEYWORD_TO_SECTION) {
    if (normalized.includes(keyword)) {
      return sectionType;
    }
  }

  return null;
}

/**
 * Detect all sections in resume text using 5-priority header pattern recognition.
 *
 * Algorithm:
 * 1. Split text into lines
 * 2. For each line, check against 5 priority patterns (highest to lowest)
 * 3. Resolve conflicts: when multiple candidates map to same section type, keep highest priority
 * 4. If no headers detected: return single "unstructured" section
 * 5. Pre-header text goes to "header-contact" section
 * 6. Text between headers assigned to preceding section
 */
export function detectSections(text: string): SectionDetectionResult {
  if (!text || text.trim().length === 0) {
    const splitLines = text ? text.split('\n') : [''];
    return {
      sections: [{
        type: 'unstructured',
        startLine: 0,
        endLine: splitLines.length - 1,
        headerLine: '',
        confidence: 0,
        lines: splitLines,
      }],
      hasStructure: false,
    };
  }

  const lines = text.split('\n');
  const candidates: HeaderCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

    if (line.length === 0) continue;

    let matched = false;

    // Priority 1: UPPERCASE + underline on next line
    if (!matched && isUppercase(line) && isUnderline(nextLine)) {
      const sectionType = matchSectionKeyword(line);
      if (sectionType) {
        candidates.push({ lineIndex: i, priority: 1, text: line, sectionType });
        matched = true;
      }
    }

    // Priority 2: UPPERCASE standalone (not embedded in sentence, < 50 chars)
    if (!matched && isUppercase(line) && isStandalone(line) && line.length < 50) {
      const sectionType = matchSectionKeyword(line);
      if (sectionType) {
        candidates.push({ lineIndex: i, priority: 2, text: line, sectionType });
        matched = true;
      }
    }

    // Priority 3: Title-case + preceded by blank line + standalone
    if (!matched && isTitleCase(line) && prevLine === '' && isStandalone(line)) {
      const sectionType = matchSectionKeyword(line);
      if (sectionType) {
        candidates.push({ lineIndex: i, priority: 3, text: line, sectionType });
        matched = true;
      }
    }

    // Priority 4: Title-case + followed by colon
    if (!matched && line.endsWith(':') && isTitleCase(line)) {
      const textWithoutColon = line.slice(0, -1).trim();
      const sectionType = matchSectionKeyword(textWithoutColon);
      if (sectionType) {
        candidates.push({ lineIndex: i, priority: 4, text: textWithoutColon, sectionType });
        matched = true;
      }
    }

    // Priority 5: Inline text containing section keyword (< 40 chars)
    if (!matched && line.length < 40) {
      const sectionType = matchSectionKeyword(line);
      if (sectionType) {
        candidates.push({ lineIndex: i, priority: 5, text: line, sectionType });
      }
    }
  }

  // Resolve conflicts: when multiple candidates map to same section type,
  // keep the one with highest priority (lowest number)
  const resolvedHeaders = resolveConflicts(candidates);

  if (resolvedHeaders.length === 0) {
    return {
      sections: [{
        type: 'unstructured',
        startLine: 0,
        endLine: lines.length - 1,
        headerLine: '',
        confidence: 0,
        lines,
      }],
      hasStructure: false,
    };
  }

  // Build sections from resolved headers
  return buildSections(lines, resolvedHeaders);
}

/**
 * Resolve conflicts: when multiple candidates map to the same section type,
 * keep only the one with the highest priority (lowest number).
 * Results are sorted by line index.
 */
function resolveConflicts(candidates: HeaderCandidate[]): HeaderCandidate[] {
  const bestByType = new Map<SectionType, HeaderCandidate>();

  for (const candidate of candidates) {
    const existing = bestByType.get(candidate.sectionType);
    if (!existing || candidate.priority < existing.priority) {
      bestByType.set(candidate.sectionType, candidate);
    }
  }

  return Array.from(bestByType.values()).sort((a, b) => a.lineIndex - b.lineIndex);
}

/**
 * Build section objects from resolved headers.
 * Pre-header text goes to "header-contact" section.
 * Text between headers is assigned to the preceding section.
 */
function buildSections(lines: string[], headers: HeaderCandidate[]): SectionDetectionResult {
  const sections: DetectedSection[] = [];

  // Handle pre-header text as "header-contact"
  const firstHeaderLine = headers[0].lineIndex;
  if (firstHeaderLine > 0) {
    sections.push({
      type: 'header-contact',
      startLine: 0,
      endLine: firstHeaderLine - 1,
      headerLine: '',
      confidence: 5,
      lines: lines.slice(0, firstHeaderLine),
    });
  }

  // Build sections from headers
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const startLine = header.lineIndex;
    const endLine = i < headers.length - 1
      ? headers[i + 1].lineIndex - 1
      : lines.length - 1;

    sections.push({
      type: header.sectionType,
      startLine,
      endLine,
      headerLine: header.text,
      confidence: header.priority,
      lines: lines.slice(startLine, endLine + 1),
    });
  }

  return {
    sections,
    hasStructure: true,
  };
}

/**
 * Get lines belonging to a specific section type.
 * Returns all lines from sections matching the given type.
 * If multiple sections of the same type exist, concatenates their lines.
 */
export function getSectionContent(result: SectionDetectionResult, type: SectionType): string[] {
  const matchingSections = result.sections.filter(s => s.type === type);
  const allLines: string[] = [];
  for (const section of matchingSections) {
    allLines.push(...section.lines);
  }
  return allLines;
}
