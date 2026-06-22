/**
 * Property-based tests for Skill Extractor.
 *
 * Tests:
 * - Property 14: Skill Extraction and Normalization — verifies synonym normalization
 *   and importance classification based on context.
 * - Property 17: LLM Graceful Degradation (Skill Extractor) — verifies valid result
 *   using local fallback when all LLM providers are unavailable.
 *
 * **Validates: Requirements 4.1, 4.3, 4.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

vi.mock('../llm/llm-service', () => ({
  completeWithCache: vi.fn(),
}));

vi.mock('../supabase/server', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import {
  extractSkillsFromJob,
  extractSkillsLocal,
  normalizeSkillName,
} from './skill-extractor';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * The synonym map from the skill extractor. We define a subset of well-known
 * synonym → canonical mappings for testing.
 */
const SYNONYM_PAIRS: Array<{ synonym: string; canonical: string }> = [
  { synonym: 'react.js', canonical: 'react' },
  { synonym: 'reactjs', canonical: 'react' },
  { synonym: 'nodejs', canonical: 'node.js' },
  { synonym: 'node js', canonical: 'node.js' },
  { synonym: 'ts', canonical: 'typescript' },
  { synonym: 'ecmascript', canonical: 'javascript' },
  { synonym: 'es6', canonical: 'javascript' },
  { synonym: 'python3', canonical: 'python' },
  { synonym: 'python 3', canonical: 'python' },
  { synonym: 'nextjs', canonical: 'next.js' },
  { synonym: 'next js', canonical: 'next.js' },
  { synonym: 'vuejs', canonical: 'vue' },
  { synonym: 'vue.js', canonical: 'vue' },
  { synonym: 'angularjs', canonical: 'angular' },
  { synonym: 'angular.js', canonical: 'angular' },
  { synonym: 'cpp', canonical: 'c++' },
  { synonym: 'cplusplus', canonical: 'c++' },
  { synonym: 'csharp', canonical: 'c#' },
  { synonym: 'c sharp', canonical: 'c#' },
  { synonym: 'tailwindcss', canonical: 'tailwind css' },
  { synonym: 'k8s', canonical: 'kubernetes' },
  { synonym: 'container orchestration', canonical: 'kubernetes' },
  { synonym: 'golang', canonical: 'go' },
  { synonym: 'go lang', canonical: 'go' },
  { synonym: 'scss', canonical: 'sass' },
  { synonym: 'mongoose', canonical: 'mongodb' },
  { synonym: 'cicd', canonical: 'ci/cd' },
  { synonym: 'ci cd', canonical: 'ci/cd' },
  { synonym: 'continuous integration', canonical: 'ci/cd' },
  { synonym: 'containerization', canonical: 'docker' },
  { synonym: 'docker compose', canonical: 'docker' },
  { synonym: 'version control', canonical: 'git' },
  { synonym: 'amazon web services', canonical: 'aws' },
  { synonym: 'microsoft excel', canonical: 'excel' },
  { synonym: 'ms excel', canonical: 'excel' },
  { synonym: 'team work', canonical: 'team collaboration' },
  { synonym: 'collaboration', canonical: 'team collaboration' },
  { synonym: 'kanban', canonical: 'agile' },
  { synonym: 'agile methodology', canonical: 'agile' },
];

/** Arbitrary that picks a synonym pair from the known mapping */
const synonymPairArb = fc.constantFrom(...SYNONYM_PAIRS);

/** Arbitrary that generates a job description containing a specific skill mention */
function descriptionWithSkillArb(skill: string): fc.Arbitrary<string> {
  return fc.tuple(
    fc.string({ minLength: 10, maxLength: 50 }),
    fc.string({ minLength: 10, maxLength: 50 }),
  ).map(([prefix, suffix]) =>
    `${prefix} We are looking for someone with experience in ${skill} for our team. ${suffix}`
  );
}

/** Arbitrary that generates qualifications text with a skill (makes it "required") */
function qualificationsWithSkillArb(skill: string): fc.Arbitrary<string> {
  return fc.string({ minLength: 10, maxLength: 40 }).map(
    (suffix) => `Required qualifications: proficiency in ${skill}. ${suffix}`
  );
}

/** Arbitrary that generates a "nice to have" description with a skill (makes it "preferred") */
function niceToHaveDescriptionArb(skill: string): fc.Arbitrary<string> {
  return fc.tuple(
    fc.string({ minLength: 10, maxLength: 40 }),
    fc.string({ minLength: 10, maxLength: 40 }),
  ).map(([prefix, suffix]) =>
    `${prefix} Nice to have: experience with ${skill} is a bonus. ${suffix}`
  );
}

// ---------------------------------------------------------------------------
// Property 14: Skill Extraction and Normalization
// ---------------------------------------------------------------------------

describe('Property 14: Skill Extraction and Normalization', () => {
  /**
   * **Validates: Requirements 4.1, 4.3, 4.4**
   *
   * For any skill that has synonyms in the synonym map, extractSkillsLocal
   * should normalize it to the canonical form. Also verify importance
   * classification: skills in qualifications section → "required",
   * skills near "nice to have" text → "preferred".
   */

  it('normalizeSkillName should map any synonym to its canonical form', () => {
    fc.assert(
      fc.property(
        synonymPairArb,
        ({ synonym, canonical }) => {
          const normalized = normalizeSkillName(synonym);
          expect(normalized).toBe(canonical);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('normalizeSkillName should return canonical names unchanged', () => {
    const canonicals = [...new Set(SYNONYM_PAIRS.map((p) => p.canonical))];
    const canonicalArb = fc.constantFrom(...canonicals);

    fc.assert(
      fc.property(
        canonicalArb,
        (canonical) => {
          const normalized = normalizeSkillName(canonical);
          expect(normalized).toBe(canonical);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('extractSkillsLocal should normalize synonym skill names to canonical form in results', () => {
    fc.assert(
      fc.property(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 30 }),
        ({ synonym, canonical }, extraText) => {
          const description = `We need a developer with strong ${synonym} experience. ${extraText}`;
          const result = extractSkillsLocal(description, null, []);

          // Find the skill in results matching the canonical name
          const matchedSkill = result.find((s) => s.skillName === canonical);
          expect(matchedSkill).toBeDefined();
          expect(matchedSkill!.skillName).toBe(canonical);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('skills in qualifications section should be classified as "required"', () => {
    fc.assert(
      fc.property(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 30 }),
        ({ synonym, canonical }, extraText) => {
          // Place the skill in qualifications text (not near "nice to have")
          const qualifications = `Must have ${synonym} skills. ${extraText}`;
          const description = `Join our team to build amazing products. ${extraText}`;

          const result = extractSkillsLocal(description, qualifications, []);
          const matchedSkill = result.find((s) => s.skillName === canonical);

          if (matchedSkill) {
            expect(matchedSkill.importance).toBe('required');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('skills near "nice to have" text should be classified as "preferred"', () => {
    fc.assert(
      fc.property(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 30 }),
        ({ synonym, canonical }, extraText) => {
          // Place the skill explicitly near "nice to have" in description
          const description = `Nice to have: experience with ${synonym} is a bonus. ${extraText}`;

          const result = extractSkillsLocal(description, null, []);
          const matchedSkill = result.find((s) => s.skillName === canonical);

          if (matchedSkill) {
            expect(matchedSkill.importance).toBe('preferred');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('all extracted skills should have normalized names (no raw synonyms in output)', () => {
    fc.assert(
      fc.property(
        fc.array(synonymPairArb, { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 5, maxLength: 20 }),
        (pairs, extraText) => {
          // Build a description mentioning multiple synonyms
          const uniquePairs = pairs.filter(
            (p, i, arr) => arr.findIndex((x) => x.canonical === p.canonical) === i
          );
          const description = uniquePairs
            .map((p) => `Experience with ${p.synonym} required.`)
            .join(' ') + ` ${extraText}`;

          const result = extractSkillsLocal(description, null, []);

          // Every skill in the result should be a canonical name
          for (const skill of result) {
            // Re-normalizing should be idempotent
            expect(normalizeSkillName(skill.skillName)).toBe(skill.skillName);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: LLM Graceful Degradation (Skill Extractor)
// ---------------------------------------------------------------------------

describe('Property 17: LLM Graceful Degradation (Skill Extractor)', () => {
  /**
   * **Validates: Requirements 4.1, 4.3, 4.4**
   *
   * When all LLM providers are unavailable (completeWithCache throws
   * LLMUnavailableError), extractSkillsFromJob should still return a valid
   * SkillExtractionResult with source.method === 'local'.
   */

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid result with source.method "local" when LLM is unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 40 }),
        async ({ synonym, canonical }, extraText) => {
          // Make completeWithCache throw LLMUnavailableError
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'timeout', retryable: false },
              { provider: 'gemini', errorType: 'network_error', message: 'timeout', retryable: false },
              { provider: 'llm7', errorType: 'network_error', message: 'timeout', retryable: false },
            ])
          );

          const description = `We need a developer with strong ${synonym} experience. ${extraText}`;

          const result = await extractSkillsFromJob(description, null, []);

          // Should use local fallback
          expect(result.source.method).toBe('local');
          expect(result.source.provider).toBeUndefined();

          // Should still return a valid SkillExtractionResult
          expect(result.skills).toBeInstanceOf(Array);

          // Skills should contain the skill mentioned in the description
          const matchedSkill = result.skills.find((s) => s.skillName === canonical);
          expect(matchedSkill).toBeDefined();

          // All returned skills should have valid structure
          for (const skill of result.skills) {
            expect(typeof skill.skillName).toBe('string');
            expect(skill.skillName.length).toBeGreaterThan(0);
            expect(['required', 'preferred']).toContain(skill.importance);
            expect(typeof skill.rawText).toBe('string');
            expect(typeof skill.confidence).toBe('number');
            expect(skill.confidence).toBeGreaterThanOrEqual(0);
            expect(skill.confidence).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return valid result with normalized skills even when LLM throws unexpected errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 40 }),
        async ({ synonym, canonical }, extraText) => {
          // Make completeWithCache throw a generic unexpected error
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error('Unexpected network failure')
          );

          const description = `Looking for someone proficient in ${synonym}. ${extraText}`;

          const result = await extractSkillsFromJob(description, null, []);

          // Should still gracefully fall back to local
          expect(result.source.method).toBe('local');
          expect(result.skills).toBeInstanceOf(Array);

          // Skills should be properly normalized
          for (const skill of result.skills) {
            expect(normalizeSkillName(skill.skillName)).toBe(skill.skillName);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should produce results with the same structure regardless of extraction method', async () => {
    await fc.assert(
      fc.asyncProperty(
        synonymPairArb,
        fc.string({ minLength: 5, maxLength: 30 }),
        async ({ synonym }, extraText) => {
          // Force local fallback
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'gemini', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'timeout', retryable: false },
            ])
          );

          const description = `Required: experience in ${synonym}. ${extraText}`;

          const result = await extractSkillsFromJob(description, null, []);

          // Validate SkillExtractionResult shape
          expect(result).toHaveProperty('skills');
          expect(result).toHaveProperty('source');
          expect(result.source).toHaveProperty('method');
          expect(result.source.method).toBe('local');

          // Each skill must conform to ExtractedSkill interface
          for (const skill of result.skills) {
            expect(skill).toHaveProperty('skillName');
            expect(skill).toHaveProperty('importance');
            expect(skill).toHaveProperty('rawText');
            expect(skill).toHaveProperty('confidence');
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
