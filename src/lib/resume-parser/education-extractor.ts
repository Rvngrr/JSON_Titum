/**
 * Education Extractor for Resume Parsing
 *
 * Extracts structured education entries with degree, institution, field of study,
 * and graduation year from resume education section lines.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
 */

export interface EducationEntry {
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  graduationYear: string;
}

/** Maximum number of education entries to extract */
const MAX_ENTRIES = 20;

/**
 * Degree keywords to detect education entries.
 * Ordered from most specific to least to avoid partial matches.
 */
const DEGREE_KEYWORDS: string[] = [
  'Ph.D.',
  'B.S.',
  'M.S.',
  'M.A.',
  'B.A.',
  'Bachelor',
  'Master',
  'Associate',
  'Diploma',
  'Doctor',
];

/**
 * Regex to match degree keywords (case-insensitive).
 * Handles variations like "Ph.D", "PhD", "B.S", "BS", etc.
 */
const DEGREE_PATTERN = new RegExp(
  '\\b(' +
    'Ph\\.?D\\.?|' +
    'B\\.?S\\.?|' +
    'M\\.?S\\.?|' +
    'M\\.?A\\.?|' +
    'B\\.?A\\.?|' +
    'Bachelor(?:\'?s)?|' +
    'Master(?:\'?s)?|' +
    'Associate(?:\'?s)?|' +
    'Diploma|' +
    'Doctor(?:ate)?' +
  ')\\b',
  'i'
);

/**
 * Regex patterns for date ranges and single years.
 * Matches formats like:
 *   "2019 - 2023", "2019 – 2023", "2019-2023"
 *   "Jan 2022 - Present", "March 2021 – December 2022"
 *   Single year "2020"
 */
const DATE_RANGE_PATTERN = /(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(\d{4})\s*[-–—]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(\d{4}|Present|Current)/i;

const SINGLE_YEAR_PATTERN = /\b(19|20)\d{2}\b/;

/**
 * Delimiters used to split degree from institution.
 * Checked in order: " - ", ", ", " | ", " at ", " from "
 */
const DELIMITERS: Array<{ pattern: RegExp; keyword: boolean }> = [
  { pattern: / - /,     keyword: false },
  { pattern: /, /,      keyword: false },
  { pattern: / \| /,    keyword: false },
  { pattern: / at /i,   keyword: true },
  { pattern: / from /i, keyword: true },
];

/**
 * Pattern for "Bachelor of Science in X" or "Master of Arts in X"
 * This takes priority over the generic "in/of" pattern.
 */
const DEGREE_OF_FIELD_IN_PATTERN = /(?:Bachelor|Master|Doctor(?:ate)?|Associate)(?:'?s?)?\s+of\s+\w+\s+in\s+([A-Z][A-Za-z\s&]+?)(?:\s*[-–,|]|\s*$|\s+(?:at|from)\b)/i;

/**
 * Generic field of study pattern matching "in X" where X starts with uppercase.
 * Only matches "in" to avoid false positives from "of" (which is part of degree names).
 */
const FIELD_IN_PATTERN = /\bin\s+([A-Z][A-Za-z\s&]+?)(?:\s*[-–,|]|\s*$|\s+(?:at|from)\b)/;

/**
 * Extract education entries from section lines (max 20 entries).
 *
 * Algorithm:
 * 1. Iterate through lines looking for degree keywords or date patterns
 * 2. When a trigger line is found, extract graduation year from date patterns
 * 3. Split degree from institution using delimiter-based parsing
 * 4. Detect field of study from "in" or "of" keywords
 * 5. Handle missing fields gracefully (empty string, not undefined)
 */
export function extractEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];

  for (let i = 0; i < lines.length && entries.length < MAX_ENTRIES; i++) {
    const line = lines[i].trim();

    if (line.length === 0) continue;

    const hasDegreeKeyword = DEGREE_PATTERN.test(line);
    const hasDatePattern = DATE_RANGE_PATTERN.test(line) || SINGLE_YEAR_PATTERN.test(line);

    // Skip lines that have neither a degree keyword nor a date pattern
    if (!hasDegreeKeyword && !hasDatePattern) continue;

    const entry = parseLine(line);
    entries.push(entry);
  }

  return entries;
}

/**
 * Parse a single line into an EducationEntry.
 */
function parseLine(line: string): EducationEntry {
  const graduationYear = extractGraduationYear(line);
  const fieldOfStudy = extractFieldOfStudy(line);

  // Remove date range from line before splitting degree/institution
  const lineWithoutDates = removeDatePatterns(line).trim();

  const { degree, institution } = splitDegreeAndInstitution(lineWithoutDates);

  return {
    degree: degree.trim(),
    institution: institution.trim(),
    fieldOfStudy,
    graduationYear,
  };
}

/**
 * Extract graduation year from a line.
 * - For date ranges like "2019 - 2023", returns the end year "2023"
 * - For single years like "2020", returns "2020"
 * - Returns empty string if no year found
 */
function extractGraduationYear(line: string): string {
  // Try date range first (end year takes priority)
  const rangeMatch = line.match(DATE_RANGE_PATTERN);
  if (rangeMatch) {
    const endPart = rangeMatch[2];
    // If end is "Present" or "Current", use start year
    if (/present|current/i.test(endPart)) {
      return rangeMatch[1];
    }
    return endPart;
  }

  // Try finding all single years and take the last one
  const yearMatches = line.match(/\b((?:19|20)\d{2})\b/g);
  if (yearMatches && yearMatches.length > 0) {
    return yearMatches[yearMatches.length - 1];
  }

  return '';
}

/**
 * Extract field of study from a line.
 * Looks for patterns like "Bachelor of Science in Computer Science"
 * or standalone "in Computer Science"
 * Returns null if not detected.
 */
function extractFieldOfStudy(line: string): string | null {
  // First try "Bachelor of Science in X" pattern (most specific)
  const degreeOfMatch = line.match(DEGREE_OF_FIELD_IN_PATTERN);
  if (degreeOfMatch && degreeOfMatch[1]) {
    const field = degreeOfMatch[1].trim();
    if (field.length >= 2) {
      return field;
    }
  }

  // Then try generic "in X" pattern
  const inMatch = line.match(FIELD_IN_PATTERN);
  if (inMatch && inMatch[1]) {
    const field = inMatch[1].trim();
    if (field.length >= 2) {
      return field;
    }
  }

  // Try "of Engineering" standalone pattern (not "of Science in X")
  const ofPattern = /\bof\s+([A-Z][A-Za-z\s&]+?)(?:\s*[-–,|]|\s*$|\s+(?:at|from)\b)/;
  const ofMatch = line.match(ofPattern);
  if (ofMatch && ofMatch[1]) {
    const field = ofMatch[1].trim();
    // Only match "of X" when X is not "Science" or "Arts" followed by "in"
    // (those are part of the degree name like "Bachelor of Science in ...")
    const hasInAfter = new RegExp(`\\bof\\s+${field}\\s+in\\b`, 'i').test(line);
    if (field.length >= 2 && !hasInAfter) {
      return field;
    }
  }

  return null;
}

/**
 * Remove date patterns from a line to make degree/institution splitting easier.
 */
function removeDatePatterns(line: string): string {
  let result = line;

  // Remove full date ranges (e.g., "Jan 2022 - Present", "2019 - 2023")
  result = result.replace(
    /(?:\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?\d{4}\s*[-–—]\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:\d{4}|Present|Current)/gi,
    ''
  );

  // Remove remaining standalone years (only if surrounded by non-digit context)
  result = result.replace(/\b(19|20)\d{2}\b/g, '');

  // Clean up leftover delimiters and extra spaces
  result = result.replace(/\(\s*\)/g, ''); // Remove empty parentheses
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}

/**
 * Split a line into degree and institution parts using known delimiters.
 * Checks delimiters in order: " - ", ", ", " | ", " at ", " from "
 *
 * Strategy:
 * - If a degree keyword is found, the part containing it is the degree
 * - The other part is the institution
 * - If no delimiter splits the line, the whole text is the degree and institution is empty
 */
function splitDegreeAndInstitution(line: string): { degree: string; institution: string } {
  if (!line || line.length === 0) {
    return { degree: '', institution: '' };
  }

  for (const delimiter of DELIMITERS) {
    const match = line.match(delimiter.pattern);
    if (match && match.index !== undefined) {
      const splitIndex = match.index;
      const left = line.slice(0, splitIndex).trim();
      const right = line.slice(splitIndex + match[0].length).trim();

      if (left.length === 0 || right.length === 0) continue;

      // Determine which part is the degree and which is the institution
      const leftHasDegree = DEGREE_PATTERN.test(left);
      const rightHasDegree = DEGREE_PATTERN.test(right);

      if (leftHasDegree && !rightHasDegree) {
        return { degree: left, institution: right };
      }
      if (rightHasDegree && !leftHasDegree) {
        return { degree: right, institution: left };
      }

      // Both or neither have degree keyword: use position heuristic
      // Convention: degree comes first, institution second
      return { degree: left, institution: right };
    }
  }

  // No delimiter found: entire line is the degree, institution is empty
  return { degree: line, institution: '' };
}
