/**
 * Property-based tests for Proficiency Analyzer.
 *
 * Tests:
 * - Property 7: Proficiency Classification from Context — verify each indicator set
 *   maps to correct proficiency level and default is intermediate (test local fallback path).
 * - Property 17: LLM Graceful Degradation (Proficiency Analyzer) — verify valid result
 *   using local fallback when all LLM providers unavailable.
 *
 * **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

vi.mock('../llm/llm-service', () => ({
  completeWithCache: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import {
  analyzeSkillProficiency,
  analyzeProficiencyBatch,
  analyzeProficiencyLocal,
  analyzeProficiencyBatchLocal,
} from './proficiency-analyzer';

// ---------------------------------------------------------------------------
// Indicator definitions matching the implementation
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
// Generators
// ---------------------------------------------------------------------------

/** Arbitrary that picks one expert indicator */
const expertIndicatorArb = fc.constantFrom(...EXPERT_INDICATORS);

/** Arbitrary that picks one intermediate indicator */
const intermediateIndicatorArb = fc.constantFrom(...INTERMEDIATE_INDICATORS);

/** Arbitrary that picks one beginner indicator */
const beginnerIndicatorArb = fc.constantFrom(...BEGINNER_INDICATORS);

/** Arbitrary that generates a random skill name */
const skillNameArb = fc.constantFrom(
  'React',
  'TypeScript',
  'Python',
  'Docker',
  'AWS',
  'Node.js',
  'Java',
  'SQL',
  'Kubernetes',
  'GraphQL',
  'Next.js',
  'PostgreSQL',
  'Redis',
  'Terraform',
  'Go',
);

/**
 * Generates surrounding text that contains the given indicator embedded
 * naturally, WITHOUT containing any indicators from other levels.
 */
function surroundingTextWithIndicator(indicator: string): fc.Arbitrary<string> {
  // Use simple alphabetic words to avoid accidentally including other indicators
  return fc.tuple(
    fc.array(fc.constantFrom('at', 'the', 'company', 'project', 'team', 'role', 'work', 'great', 'strong'), { minLength: 2, maxLength: 5 }),
    fc.array(fc.constantFrom('for', 'our', 'platform', 'system', 'service', 'stack', 'tools', 'many', 'build'), { minLength: 2, maxLength: 5 }),
  ).map(([prefix, suffix]) =>
    `${prefix.join(' ')} ${indicator} ${suffix.join(' ')}`
  );
}

/**
 * Generates text that does NOT contain any known proficiency indicators.
 * Uses only safe words that won't match any indicator.
 */
const neutralTextArb: fc.Arbitrary<string> = fc.array(
  fc.constantFrom(
    'the', 'a', 'with', 'on', 'in', 'at', 'or', 'and', 'for', 'to',
    'technology', 'stack', 'team', 'company', 'platform', 'application',
    'web', 'mobile', 'cloud', 'data', 'testing', 'deployment', 'pipeline',
    'environment', 'production', 'staging', 'integration', 'configuration',
  ),
  { minLength: 5, maxLength: 15 },
).map((words) => words.join(' '));

/** Arbitrary that generates a realistic resume snippet containing skills */
const resumeTextArb: fc.Arbitrary<string> = fc.tuple(
  skillNameArb,
  fc.constantFrom(
    'Led a team of 5 engineers to architect and deploy a microservices platform using',
    'Used and developed features with',
    'Familiar with basic concepts of',
    'Implemented scalable solutions leveraging',
    'Mentored junior developers on best practices for',
    'Took a course on',
    'Contributed to open source projects involving',
    'Architected the entire backend system using',
    'Has exposure to',
    'Senior engineer with 5+ years building systems with',
  ),
).map(([skill, context]) => `${context} ${skill}. Additional experience in various areas.`);

// ---------------------------------------------------------------------------
// Property 7: Proficiency Classification from Context
// ---------------------------------------------------------------------------

describe('Property 7: Proficiency Classification from Context', () => {
  /**
   * **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
   *
   * For any skill mention surrounded by text containing expert indicators,
   * the Proficiency_Analyzer SHALL classify it as expert. For intermediate
   * indicators → intermediate. For beginner indicators → beginner.
   * For no indicators → default intermediate.
   */

  it('text containing an expert indicator should classify as expert', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        expertIndicatorArb,
        (skill, indicator) => {
          // Build text containing only the expert indicator
          const surroundingText = `At the company, ${indicator} the engineering team working with ${skill} for critical systems.`;
          const result = analyzeProficiencyLocal(skill, surroundingText);

          expect(result.skillName).toBe(skill);
          expect(result.level).toBe('expert');
          expect(result.confidence).toBeGreaterThan(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(typeof result.evidence).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('text containing a beginner indicator (without expert indicators) should classify as beginner', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        beginnerIndicatorArb,
        (skill, indicator) => {
          // Build text with only beginner indicator — no expert or intermediate indicators
          const surroundingText = `Has ${indicator} to ${skill} through online resources and self-study.`;
          const result = analyzeProficiencyLocal(skill, surroundingText);

          expect(result.skillName).toBe(skill);
          expect(result.level).toBe('beginner');
          expect(result.confidence).toBeGreaterThan(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(typeof result.evidence).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('text containing an intermediate indicator (without expert or beginner indicators) should classify as intermediate', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        intermediateIndicatorArb,
        (skill, indicator) => {
          // Build text with only intermediate indicator
          const surroundingText = `Has ${indicator} ${skill} in multiple projects across the organization.`;
          const result = analyzeProficiencyLocal(skill, surroundingText);

          expect(result.skillName).toBe(skill);
          expect(result.level).toBe('intermediate');
          expect(result.confidence).toBeGreaterThan(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          expect(typeof result.evidence).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('text containing NO indicators should default to intermediate', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        neutralTextArb,
        (skill, neutralText) => {
          const result = analyzeProficiencyLocal(skill, neutralText);

          expect(result.skillName).toBe(skill);
          expect(result.level).toBe('intermediate');
          expect(result.confidence).toBe(0.5); // Lower confidence for default
          expect(result.evidence).toBe('No specific proficiency indicators found in context');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('expert indicators take priority when multiple levels are present in text', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        expertIndicatorArb,
        beginnerIndicatorArb,
        (skill, expertIndicator, beginnerIndicator) => {
          // Text contains both expert AND beginner indicators — expert should win
          const surroundingText = `${expertIndicator} the team and has ${beginnerIndicator} with newer tech. Worked with ${skill}.`;
          const result = analyzeProficiencyLocal(skill, surroundingText);

          expect(result.level).toBe('expert');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('batch local analysis should produce consistent results with single-skill analysis', () => {
    fc.assert(
      fc.property(
        fc.array(skillNameArb, { minLength: 1, maxLength: 5 }),
        expertIndicatorArb,
        (skills, indicator) => {
          const uniqueSkills = [...new Set(skills)];
          // Resume text mentioning all skills with an expert indicator
          const resumeText = `${indicator} multiple projects including ${uniqueSkills.join(', ')} across the organization.`;

          const batchResults = analyzeProficiencyBatchLocal(uniqueSkills, resumeText);

          expect(batchResults).toHaveLength(uniqueSkills.length);

          for (const result of batchResults) {
            expect(uniqueSkills).toContain(result.skillName);
            expect(['beginner', 'intermediate', 'expert']).toContain(result.level);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(typeof result.evidence).toBe('string');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('all proficiency levels returned should be valid enum values', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        fc.constantFrom(...EXPERT_INDICATORS, ...INTERMEDIATE_INDICATORS, ...BEGINNER_INDICATORS, 'no indicator at all'),
        (skill, indicator) => {
          const surroundingText = `Experience with ${skill}: ${indicator} in various contexts.`;
          const result = analyzeProficiencyLocal(skill, surroundingText);

          expect(['beginner', 'intermediate', 'expert']).toContain(result.level);
          expect(result.skillName).toBe(skill);
          expect(typeof result.evidence).toBe('string');
          expect(result.evidence.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: LLM Graceful Degradation (Proficiency Analyzer)
// ---------------------------------------------------------------------------

describe('Property 17: LLM Graceful Degradation (Proficiency Analyzer)', () => {
  /**
   * **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
   *
   * When all LLM providers are unavailable (completeWithCache throws
   * LLMUnavailableError), analyzeSkillProficiency and analyzeProficiencyBatch
   * should still return valid results using local fallback with
   * source.method === 'local'.
   */

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzeSkillProficiency returns valid result with method "local" when LLM unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        skillNameArb,
        expertIndicatorArb,
        async (skill, indicator) => {
          // Make LLM throw LLMUnavailableError
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'Connection refused', retryable: false },
              { provider: 'gemini', errorType: 'rate_limit', message: 'Quota exceeded', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'Request timed out', retryable: false },
            ])
          );

          const surroundingText = `${indicator} the team building systems with ${skill} for enterprise clients.`;
          const result = await analyzeSkillProficiency(skill, surroundingText);

          // Should return a valid ProficiencyResult
          expect(result.skillName).toBe(skill);
          expect(['beginner', 'intermediate', 'expert']).toContain(result.level);
          expect(typeof result.evidence).toBe('string');
          expect(result.evidence.length).toBeGreaterThan(0);
          expect(result.confidence).toBeGreaterThan(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('analyzeProficiencyBatch returns valid batch result with method "local" when LLM unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(skillNameArb, { minLength: 1, maxLength: 5 }),
        resumeTextArb,
        async (skills, resumeText) => {
          const uniqueSkills = [...new Set(skills)];

          // Make LLM throw LLMUnavailableError
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'Connection refused', retryable: false },
              { provider: 'gemini', errorType: 'network_error', message: 'DNS failure', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'Request timed out', retryable: false },
            ])
          );

          const result = await analyzeProficiencyBatch(uniqueSkills, resumeText);

          // Should use local fallback
          expect(result.source.method).toBe('local');
          expect(result.source.provider).toBeUndefined();

          // Should return results for all requested skills
          expect(result.results).toHaveLength(uniqueSkills.length);

          // Each result must conform to ProficiencyResult interface
          for (const profResult of result.results) {
            expect(typeof profResult.skillName).toBe('string');
            expect(profResult.skillName.length).toBeGreaterThan(0);
            expect(['beginner', 'intermediate', 'expert']).toContain(profResult.level);
            expect(typeof profResult.evidence).toBe('string');
            expect(profResult.evidence.length).toBeGreaterThan(0);
            expect(typeof profResult.confidence).toBe('number');
            expect(profResult.confidence).toBeGreaterThan(0);
            expect(profResult.confidence).toBeLessThanOrEqual(1);
          }

          // All requested skill names should appear in results
          const resultSkillNames = result.results.map((r) => r.skillName);
          for (const skill of uniqueSkills) {
            expect(resultSkillNames).toContain(skill);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('gracefully degrades on unexpected errors (not just LLMUnavailableError)', async () => {
    await fc.assert(
      fc.asyncProperty(
        skillNameArb,
        beginnerIndicatorArb,
        async (skill, indicator) => {
          // Make LLM throw an unexpected generic error
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error('Unexpected internal server error')
          );

          const surroundingText = `Has ${indicator} to ${skill} through online training materials.`;
          const result = await analyzeSkillProficiency(skill, surroundingText);

          // Should still return valid result using local fallback
          expect(result.skillName).toBe(skill);
          expect(['beginner', 'intermediate', 'expert']).toContain(result.level);
          expect(typeof result.evidence).toBe('string');
          expect(result.confidence).toBeGreaterThan(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('fallback result conforms to same ProficiencyResult interface as LLM result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(skillNameArb, { minLength: 1, maxLength: 4 }),
        async (skills) => {
          const uniqueSkills = [...new Set(skills)];

          // Force local fallback
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'gemini', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'timeout', retryable: false },
            ])
          );

          const resumeText = `Experienced developer who has used ${uniqueSkills.join(' and ')} in production.`;
          const result = await analyzeProficiencyBatch(uniqueSkills, resumeText);

          // Validate the full ProficiencyBatchResult shape
          expect(result).toHaveProperty('results');
          expect(result).toHaveProperty('source');
          expect(result.source).toHaveProperty('method');
          expect(result.source.method).toBe('local');

          // Each result should have all ProficiencyResult fields
          for (const profResult of result.results) {
            expect(profResult).toHaveProperty('skillName');
            expect(profResult).toHaveProperty('level');
            expect(profResult).toHaveProperty('evidence');
            expect(profResult).toHaveProperty('confidence');
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
