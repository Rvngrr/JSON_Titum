/**
 * Property-Based Tests for Section Detector
 *
 * Feature: hybrid-ats-resume-parser
 * - Property 3: Section Coverage
 *
 * **Validates: Requirements 3.4, 3.5, 3.6**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { detectSections } from "./section-detector";

// --- Arbitraries ---

/**
 * Section header keywords that the detector recognizes.
 */
const SECTION_KEYWORDS = [
  "experience", "work experience", "employment", "internships", "leadership",
  "education", "academic background", "qualifications",
  "skills", "technical skills", "core competencies", "programming",
  "certifications", "certificates", "training", "seminars",
  "projects", "portfolio", "personal projects",
  "achievements", "awards", "honors",
];

/**
 * Generates a resume-like header line in various recognized formats.
 */
function arbSectionHeader(): fc.Arbitrary<string> {
  return fc.constantFrom(...SECTION_KEYWORDS).chain((keyword) =>
    fc.constantFrom(
      keyword.toUpperCase(),                    // Priority 2: UPPERCASE standalone
      keyword.charAt(0).toUpperCase() + keyword.slice(1) + ":",  // Priority 4: Title-case + colon
      keyword.charAt(0).toUpperCase() + keyword.slice(1),        // Priority 3/5: Title-case
    )
  );
}

/**
 * Generates resume section content lines (non-header lines).
 */
function arbContentLines(): fc.Arbitrary<string[]> {
  const contentLine = fc.constantFrom(
    "- Managed a team of 5 engineers",
    "• Developed REST API using Node.js",
    "Led migration to cloud infrastructure",
    "Bachelor of Science in Computer Science",
    "Python, JavaScript, TypeScript, React",
    "AWS Certified Solutions Architect",
    "2020 - 2023",
    "Senior Software Engineer at Google",
    "Built CI/CD pipeline reducing deploy time by 40%",
    "GPA: 3.8/4.0",
  );
  return fc.array(contentLine, { minLength: 0, maxLength: 5 });
}

/**
 * Generates a resume-like multi-line text with optional section headers
 * separated by blank lines and content lines.
 */
function arbResumeLikeText(): fc.Arbitrary<string> {
  const contactBlock = fc.array(
    fc.constantFrom(
      "John Doe",
      "john.doe@email.com",
      "(555) 123-4567",
      "San Francisco, CA",
    ),
    { minLength: 1, maxLength: 4 }
  );

  const sectionBlock = fc.tuple(arbSectionHeader(), arbContentLines()).map(
    ([header, content]) => ["", header, ...content].join("\n")
  );

  return fc
    .tuple(
      contactBlock,
      fc.array(sectionBlock, { minLength: 1, maxLength: 5 })
    )
    .map(([contact, sections]) =>
      [contact.join("\n"), ...sections].join("\n")
    );
}

/**
 * Generates completely random text strings (including edge cases).
 */
function arbArbitraryText(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 300 });
}

/**
 * Generates multi-line text with random words (no recognized headers).
 */
function arbRandomMultilineText(): fc.Arbitrary<string> {
  return fc
    .array(
      fc.string({ minLength: 0, maxLength: 80 }),
      { minLength: 1, maxLength: 20 }
    )
    .map((lines) => lines.join("\n"));
}

// --- Property 3: Section Coverage ---

describe("Feature: hybrid-ats-resume-parser, Property 3: Section Coverage", () => {
  /**
   * Property 3: Section Coverage
   *
   * For all text: `detectSections(text).sections` covers every line exactly
   * once (no gaps, no overlaps).
   *
   * Sub-properties verified:
   * 1. Sections are sorted by startLine
   * 2. endLine of section[i] + 1 === startLine of section[i+1] (no gaps)
   * 3. First section starts at line 0
   * 4. Last section ends at the last line
   *
   * **Validates: Requirements 3.4, 3.5, 3.6**
   */

  it("sections cover every line exactly once for resume-like text (no gaps, no overlaps)", () => {
    fc.assert(
      fc.property(arbResumeLikeText(), (text) => {
        const result = detectSections(text);
        const lines = text.split("\n");
        const sections = result.sections;

        // Must have at least one section
        expect(sections.length).toBeGreaterThanOrEqual(1);

        // Sections are sorted by startLine
        for (let i = 1; i < sections.length; i++) {
          expect(sections[i].startLine).toBeGreaterThan(sections[i - 1].startLine);
        }

        // First section starts at line 0
        expect(sections[0].startLine).toBe(0);

        // Last section ends at the last line
        expect(sections[sections.length - 1].endLine).toBe(lines.length - 1);

        // No gaps: endLine of section[i] + 1 === startLine of section[i+1]
        for (let i = 0; i < sections.length - 1; i++) {
          expect(sections[i].endLine + 1).toBe(sections[i + 1].startLine);
        }

        // Each section's endLine >= startLine
        for (const section of sections) {
          expect(section.endLine).toBeGreaterThanOrEqual(section.startLine);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("sections cover every line exactly once for arbitrary text strings", () => {
    fc.assert(
      fc.property(arbArbitraryText(), (text) => {
        const result = detectSections(text);
        const lines = text.split("\n");
        const sections = result.sections;

        // Must have at least one section
        expect(sections.length).toBeGreaterThanOrEqual(1);

        // Sections are sorted by startLine
        for (let i = 1; i < sections.length; i++) {
          expect(sections[i].startLine).toBeGreaterThan(sections[i - 1].startLine);
        }

        // First section starts at line 0
        expect(sections[0].startLine).toBe(0);

        // Last section ends at the last line
        expect(sections[sections.length - 1].endLine).toBe(lines.length - 1);

        // No gaps between consecutive sections
        for (let i = 0; i < sections.length - 1; i++) {
          expect(sections[i].endLine + 1).toBe(sections[i + 1].startLine);
        }

        // Each section's endLine >= startLine
        for (const section of sections) {
          expect(section.endLine).toBeGreaterThanOrEqual(section.startLine);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("sections cover every line exactly once for random multi-line text", () => {
    fc.assert(
      fc.property(arbRandomMultilineText(), (text) => {
        const result = detectSections(text);
        const lines = text.split("\n");
        const sections = result.sections;

        // Must have at least one section
        expect(sections.length).toBeGreaterThanOrEqual(1);

        // Sections are sorted by startLine
        for (let i = 1; i < sections.length; i++) {
          expect(sections[i].startLine).toBeGreaterThan(sections[i - 1].startLine);
        }

        // First section starts at line 0
        expect(sections[0].startLine).toBe(0);

        // Last section ends at the last line
        expect(sections[sections.length - 1].endLine).toBe(lines.length - 1);

        // No gaps between consecutive sections
        for (let i = 0; i < sections.length - 1; i++) {
          expect(sections[i].endLine + 1).toBe(sections[i + 1].startLine);
        }

        // Each section's endLine >= startLine
        for (const section of sections) {
          expect(section.endLine).toBeGreaterThanOrEqual(section.startLine);
        }
      }),
      { numRuns: 200 }
    );
  });
});
