/**
 * Experience Extractor for Resume Parsing
 *
 * Extracts structured work experience entries from section content,
 * detecting date ranges, job titles, organizations, and bullet point
 * accomplishments.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

export interface WorkExperienceEntry {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  highlights: string[];
}

/** Maximum number of experience entries to extract */
const MAX_ENTRIES = 20;

/** Maximum number of bullet points per entry */
const MAX_BULLETS_PER_ENTRY = 20;

/** Maximum character length for a bullet point */
const MAX_BULLET_LENGTH = 200;

/**
 * Month abbreviations and full names for date pattern matching.
 */
const MONTHS =
  'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';

/**
 * Regex for date range patterns. Supports:
 * - "Jan 2022 - Present", "January 2022 - December 2023"
 * - "2020 - 2023", "2020-2023"
 * - "March 2021 – December 2022" (en-dash)
 * - "Jan 2022 - Current"
 *
 * Captures: [full match, startDate, endDate]
 */
const DATE_RANGE_REGEX = new RegExp(
  `((?:${MONTHS})\\s+\\d{4}|\\d{4})` +       // start date: "Jan 2022" or "2022"
  `\\s*[-–—]\\s*` +                            // separator: dash, en-dash, or em-dash
  `((?:${MONTHS})\\s+\\d{4}|\\d{4}|Present|Current)`, // end date or "Present"/"Current"
  'i'
);

/**
 * Regex pattern to detect bullet point lines.
 * Matches lines starting with: •, -, *, or numbered items (1., 2., etc.)
 */
const BULLET_REGEX = /^\s*(?:[•\-*]|\d+[.)]\s)/;

/**
 * Check if a line contains a date range pattern.
 */
function hasDatePattern(line: string): boolean {
  return DATE_RANGE_REGEX.test(line);
}

/**
 * Extract date range from a line.
 * Returns [startDate, endDate] or null if no match.
 */
function extractDateRange(line: string): { startDate: string; endDate: string; matchIndex: number; matchLength: number } | null {
  const match = DATE_RANGE_REGEX.exec(line);
  if (!match) return null;
  return {
    startDate: match[1].trim(),
    endDate: match[2].trim(),
    matchIndex: match.index,
    matchLength: match[0].length,
  };
}

/**
 * Separate title from organization using common delimiters.
 * Priority order: " - ", " | ", " at ", comma + capitalized word.
 *
 * If no delimiter is found, the entire text becomes the title and company is empty.
 */
function separateTitleAndCompany(text: string): { title: string; company: string } {
  const trimmed = text.trim();

  if (!trimmed) {
    return { title: '', company: '' };
  }

  // Try " - " delimiter
  const dashIndex = trimmed.indexOf(' - ');
  if (dashIndex !== -1) {
    return {
      title: trimmed.substring(0, dashIndex).trim(),
      company: trimmed.substring(dashIndex + 3).trim(),
    };
  }

  // Try " | " delimiter
  const pipeIndex = trimmed.indexOf(' | ');
  if (pipeIndex !== -1) {
    return {
      title: trimmed.substring(0, pipeIndex).trim(),
      company: trimmed.substring(pipeIndex + 3).trim(),
    };
  }

  // Try " at " delimiter (case-insensitive)
  const atMatch = trimmed.match(/\s+at\s+/i);
  if (atMatch && atMatch.index !== undefined) {
    return {
      title: trimmed.substring(0, atMatch.index).trim(),
      company: trimmed.substring(atMatch.index + atMatch[0].length).trim(),
    };
  }

  // Try comma + capitalized word
  const commaCapMatch = trimmed.match(/,\s+([A-Z])/);
  if (commaCapMatch && commaCapMatch.index !== undefined) {
    return {
      title: trimmed.substring(0, commaCapMatch.index).trim(),
      company: trimmed.substring(commaCapMatch.index + 2).trim(),
    };
  }

  // No delimiter found — entire text is title, company is empty
  return { title: trimmed, company: '' };
}

/**
 * Check if a line is a bullet point.
 */
function isBulletLine(line: string): boolean {
  return BULLET_REGEX.test(line);
}

/**
 * Clean a bullet point line: remove the leading bullet marker and trim.
 * Truncate to MAX_BULLET_LENGTH characters.
 */
function cleanBullet(line: string): string {
  // Remove leading whitespace and bullet marker
  const cleaned = line.replace(/^\s*(?:[•\-*]|\d+[.)]\s?)\s*/, '').trim();
  if (cleaned.length > MAX_BULLET_LENGTH) {
    return cleaned.substring(0, MAX_BULLET_LENGTH);
  }
  return cleaned;
}

/**
 * Determine if end date indicates a current position.
 */
function isCurrentPosition(endDate: string): boolean {
  const lower = endDate.toLowerCase();
  return lower === 'present' || lower === 'current';
}

/**
 * Extract work experience entries from section lines.
 * Lines with date patterns are treated as entry headers.
 * Lines without date patterns that appear after a header are either bullets
 * (captured as highlights) or skipped.
 *
 * @param lines - Array of text lines from the experience section
 * @returns Array of WorkExperienceEntry objects (max 20 entries)
 */
export function extractExperience(lines: string[]): WorkExperienceEntry[] {
  const entries: WorkExperienceEntry[] = [];
  let currentEntry: WorkExperienceEntry | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) continue;

    // Check if this line has a date pattern (new entry header)
    if (hasDatePattern(trimmedLine)) {
      // Save the previous entry if it exists
      if (currentEntry && entries.length < MAX_ENTRIES) {
        entries.push(currentEntry);
      }

      // If we've already hit the cap, stop processing
      if (entries.length >= MAX_ENTRIES) break;

      // Extract date range
      const dateInfo = extractDateRange(trimmedLine);
      if (!dateInfo) continue; // shouldn't happen since hasDatePattern was true, but guard

      // Extract the text portion (everything before or around the date range)
      const textBeforeDate = trimmedLine.substring(0, dateInfo.matchIndex).trim();
      const textAfterDate = trimmedLine.substring(dateInfo.matchIndex + dateInfo.matchLength).trim();

      // Use text before date as the title/company source, fall back to after if before is empty
      const headerText = textBeforeDate || textAfterDate;

      // Separate title and company
      const { title, company } = separateTitleAndCompany(headerText);

      currentEntry = {
        title,
        company,
        startDate: dateInfo.startDate,
        endDate: dateInfo.endDate,
        isCurrent: isCurrentPosition(dateInfo.endDate),
        highlights: [],
      };
    } else if (currentEntry && isBulletLine(trimmedLine)) {
      // Bullet point belongs to the current entry
      if (currentEntry.highlights.length < MAX_BULLETS_PER_ENTRY) {
        const cleaned = cleanBullet(trimmedLine);
        if (cleaned.length > 0) {
          currentEntry.highlights.push(cleaned);
        }
      }
    }
    // Lines without date patterns and without bullet markers are skipped (Req 4.7)
  }

  // Don't forget the last entry
  if (currentEntry && entries.length < MAX_ENTRIES) {
    entries.push(currentEntry);
  }

  return entries;
}
