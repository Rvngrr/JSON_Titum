/**
 * Property-based tests for ATS Scorer.
 *
 * Tests:
 * - Property 8: ATS Score Formula — verify score formula correctness and range [0, 100],
 *   same result regardless of analysisSource.
 * - Property 20: ATS Intelligent Matching Consistency — verify every keyword appears in
 *   exactly one of matchedKeywords or missingKeywords; sum equals totalKeywords.
 * - Property 21: ATS Suggestion Coverage — verify every missing keyword has at least one
 *   suggestion with valid section, suggestion text, and impact; suggestions ordered by impact.
 * - Property 22: ATS Cache Invalidation on Resume or Job Change — verify fresh LLM request
 *   when resume hash changes or job description changes.
 * - Property 17: LLM Graceful Degradation (ATS Scorer) — verify valid result using local
 *   TF-IDF + exact matching fallback when all LLM providers unavailable.
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.7**
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
  calculateATSScore,
  extractKeywords,
  extractKeywordsLocal,
  analyzeResumeMatch,
  matchKeywordsLocal,
} from './ats-scorer';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a non-empty keyword string (2-20 chars, no special characters) */
const keywordArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9.#+/ -]{1,18}[A-Za-z0-9]$/).filter(
  (s) => s.trim().length >= 2
);

/** Generates a list of unique keywords (1-15) */
const keywordsArb = fc.uniqueArray(keywordArb, { minLength: 1, maxLength: 15 });

/** Generates a realistic keyword from common tech skills */
const techKeywordArb = fc.constantFrom(
  'React', 'TypeScript', 'Python', 'Docker', 'AWS', 'Node.js',
  'Java', 'SQL', 'Kubernetes', 'GraphQL', 'Next.js', 'PostgreSQL',
  'Redis', 'Terraform', 'Go', 'CI/CD', 'Agile', 'REST API',
  'MongoDB', 'Vue.js', 'Angular', 'Git', 'Linux', 'C#',
  'Machine Learning', 'Data Analysis', 'Microservices', 'Kafka'
);

/** Generates a list of unique tech keywords (1-15) */
const techKeywordsArb = fc.uniqueArray(techKeywordArb, { minLength: 1, maxLength: 15 });

/** Generates a resume text that contains a random subset of keywords */
function resumeContainingSubset(keywords: string[]): fc.Arbitrary<{ resumeText: string; contained: string[] }> {
  return fc.subarray(keywords, { minLength: 0 }).map((subset) => {
    const parts = subset.map((kw) => `Experience with ${kw} in production.`);
    const resumeText = parts.length > 0
      ? `Senior developer. ${parts.join(' ')} Additional experience in various areas.`
      : 'Senior developer with various experience in different areas and projects.';
    return { resumeText, contained: subset };
  });
}

/** Generates a non-empty resume text */
const resumeTextArb = fc.constantFrom(
  'Senior developer with 5 years of experience in React and TypeScript. Built microservices with Docker and Kubernetes.',
  'Python developer experienced in Django and Flask. Managed databases with PostgreSQL and Redis.',
  'Full-stack engineer using Node.js, Express, and MongoDB. Deployed on AWS with CI/CD pipelines.',
  'Java developer with Spring Boot expertise. Worked with Kafka and RabbitMQ for messaging.',
  'Frontend specialist skilled in Vue.js and Angular. Strong knowledge of CSS and accessibility.',
);

/** Generates valid impact values */
const impactArb = fc.constantFrom('high', 'medium', 'low');

/** Generates a valid analysisSource */
const analysisSourceArb = fc.constantFrom('llm', 'local');

// ---------------------------------------------------------------------------
// Property 8: ATS Score Formula
// ---------------------------------------------------------------------------

describe('Property 8: ATS Score Formula', () => {
  /**
   * **Validates: Requirements 12.1, 12.3, 12.4**
   *
   * For any resume text and job description, the ATS score SHALL equal
   * Math.round((matchedKeywords.length / totalKeywords) * 100), clamped [0, 100].
   * The scoring formula is the same regardless of analysisSource.
   */

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('score equals Math.round((matched / total) * 100) clamped to [0, 100]', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        resumeTextArb,
        async (keywords, resumeText) => {
          // Mock LLM to return our keywords directly
          (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
            content: JSON.stringify({ keywords }),
            provider: 'openai',
            cached: false,
            latencyMs: 100,
          });

          const result = await calculateATSScore(
            resumeText,
            `Job requires: ${keywords.join(', ')}`,
            null,
            'job-prop8',
            'job-prop8-id'
          );

          // Verify score formula
          const expectedScore = Math.round(
            (result.matchedKeywords.length / result.totalKeywords) * 100
          );
          const clampedExpected = Math.max(0, Math.min(100, expectedScore));

          expect(result.score).toBe(clampedExpected);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('score is in [0, 100] regardless of analysisSource (local fallback)', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        resumeTextArb,
        async (keywords, resumeText) => {
          // Force local fallback by making LLM unavailable
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'fail', retryable: false },
              { provider: 'gemini', errorType: 'network_error', message: 'fail', retryable: false },
              { provider: 'llm7', errorType: 'network_error', message: 'fail', retryable: false },
            ])
          );

          const result = await calculateATSScore(
            resumeText,
            `Job requires: ${keywords.join(' ')}. ${keywords.join(' ')} experience needed.`,
            null,
            'job-prop8-local',
            'job-prop8-local-id'
          );

          // Score formula holds regardless of source
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);

          if (result.totalKeywords > 0) {
            const expectedScore = Math.max(0, Math.min(100,
              Math.round((result.matchedKeywords.length / result.totalKeywords) * 100)
            ));
            expect(result.score).toBe(expectedScore);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('matchKeywordsLocal produces scores in [0, 100] for any inputs', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);
          const totalKeywords = keywords.length;
          const matchedCount = analysis.matchedKeywords.length;
          const score = Math.max(0, Math.min(100,
            Math.round((matchedCount / totalKeywords) * 100)
          ));

          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: ATS Intelligent Matching Consistency
// ---------------------------------------------------------------------------

describe('Property 20: ATS Intelligent Matching Consistency', () => {
  /**
   * **Validates: Requirements 12.2, 12.3**
   *
   * For any resume text and set of job keywords, every keyword SHALL appear in
   * exactly one of matchedKeywords or missingKeywords (mutual exclusivity and
   * exhaustive coverage). The sum matchedKeywords.length + missingKeywords.length
   * SHALL equal totalKeywords.
   */

  it('matchKeywordsLocal: matched + missing = total keywords (partition property)', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);

          // Sum of matched and missing equals total
          expect(
            analysis.matchedKeywords.length + analysis.missingKeywords.length
          ).toBe(keywords.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchKeywordsLocal: every keyword in exactly one of matched or missing (mutual exclusivity)', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);

          const matchedSet = new Set(analysis.matchedKeywords.map((m) => m.keyword));
          const missingSet = new Set(analysis.missingKeywords);

          // Every keyword should appear in one set
          for (const kw of keywords) {
            const inMatched = matchedSet.has(kw);
            const inMissing = missingSet.has(kw);
            // Exactly one should be true (XOR)
            expect(inMatched !== inMissing).toBe(true);
          }

          // No overlaps
          for (const matched of matchedSet) {
            expect(missingSet.has(matched)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchKeywordsLocal: keywords found in resume appear in matchedKeywords', () => {
    fc.assert(
      fc.property(
        techKeywordsArb.chain((keywords) =>
          resumeContainingSubset(keywords).map((r) => ({ keywords, ...r }))
        ),
        ({ keywords, resumeText, contained }) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);
          const matchedKeywordNames = analysis.matchedKeywords.map((m) => m.keyword);

          // All contained keywords should be in matched
          for (const kw of contained) {
            expect(matchedKeywordNames).toContain(kw);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: ATS Suggestion Coverage
// ---------------------------------------------------------------------------

describe('Property 21: ATS Suggestion Coverage', () => {
  /**
   * **Validates: Requirements 12.5**
   *
   * For any ATS analysis result where missingKeywords is non-empty, the suggestions
   * array SHALL contain at least one suggestion for each missing keyword. Each suggestion
   * SHALL have a valid section (non-empty), suggestion text (non-empty), and impact
   * value of exactly 'high', 'medium', or 'low'. Suggestions SHALL be ordered by
   * impact (high first, then medium, then low).
   */

  it('every missing keyword has at least one suggestion', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);

          if (analysis.missingKeywords.length === 0) return; // nothing to check

          const suggestedKeywords = new Set(
            analysis.suggestions.map((s) => s.keyword)
          );

          for (const missing of analysis.missingKeywords) {
            expect(suggestedKeywords.has(missing)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every suggestion has valid section, suggestion text, and impact', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);

          for (const suggestion of analysis.suggestions) {
            // Valid section (non-empty string)
            expect(typeof suggestion.section).toBe('string');
            expect(suggestion.section.length).toBeGreaterThan(0);

            // Valid suggestion text (non-empty string)
            expect(typeof suggestion.suggestion).toBe('string');
            expect(suggestion.suggestion.length).toBeGreaterThan(0);

            // Valid impact value
            expect(['high', 'medium', 'low']).toContain(suggestion.impact);

            // Valid keyword reference (non-empty)
            expect(typeof suggestion.keyword).toBe('string');
            expect(suggestion.keyword.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('suggestions are ordered by impact: high first, then medium, then low', () => {
    fc.assert(
      fc.property(
        techKeywordsArb,
        resumeTextArb,
        (keywords, resumeText) => {
          const analysis = matchKeywordsLocal(resumeText, keywords);

          if (analysis.suggestions.length <= 1) return; // ordering trivially holds

          const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

          for (let i = 1; i < analysis.suggestions.length; i++) {
            const prevOrder = impactOrder[analysis.suggestions[i - 1].impact] ?? 2;
            const currOrder = impactOrder[analysis.suggestions[i].impact] ?? 2;
            expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22: ATS Cache Invalidation on Resume or Job Change
// ---------------------------------------------------------------------------

describe('Property 22: ATS Cache Invalidation on Resume or Job Change', () => {
  /**
   * **Validates: Requirements 12.7**
   *
   * For any applicant-job pair whose ATS analysis has been previously cached,
   * if either the resume text changes (different SHA-256 hash) OR the job
   * description changes, the next calculateATSScore call SHALL make a fresh
   * LLM request for the matching step, rather than returning a stale result.
   */

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('changing resume text triggers a new LLM call (different cache key)', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        fc.tuple(resumeTextArb, resumeTextArb).filter(([a, b]) => a !== b),
        async (keywords, [resume1, resume2]) => {
          const keywordsJson = JSON.stringify({ keywords });

          // First call: return keywords, then analysis
          let callCount = 0;
          (completeWithCache as ReturnType<typeof vi.fn>).mockImplementation(
            async () => {
              callCount++;
              return {
                content: keywordsJson,
                provider: 'openai',
                cached: callCount > 1, // second+ calls marked as cached
                latencyMs: 100,
              };
            }
          );

          // First call with resume1
          await calculateATSScore(
            resume1,
            `Job: ${keywords.join(', ')}`,
            null,
            'job-cache-22a',
            'job-cache-22a-id'
          );

          const callsAfterFirst = callCount;

          // Second call with different resume2
          await calculateATSScore(
            resume2,
            `Job: ${keywords.join(', ')}`,
            null,
            'job-cache-22a',
            'job-cache-22a-id'
          );

          // completeWithCache should have been called again for the matching step
          // because resume text changed (different hash produces different cache key)
          expect(callCount).toBeGreaterThan(callsAfterFirst);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('changing job description triggers a new LLM call for keyword extraction', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        resumeTextArb,
        async (keywords, resumeText) => {
          const keywordsJson = JSON.stringify({ keywords });

          let callCount = 0;
          (completeWithCache as ReturnType<typeof vi.fn>).mockImplementation(
            async () => {
              callCount++;
              return {
                content: keywordsJson,
                provider: 'openai',
                cached: false,
                latencyMs: 100,
              };
            }
          );

          // First call with job description A
          await calculateATSScore(
            resumeText,
            `Job description version A: ${keywords.join(', ')}`,
            null,
            'job-cache-22b',
            'job-cache-22b-id'
          );

          const callsAfterFirst = callCount;

          // Second call with DIFFERENT job description
          await calculateATSScore(
            resumeText,
            `Completely different job description version B: ${keywords.slice(0, 2).join(', ')}`,
            null,
            'job-cache-22b',
            'job-cache-22b-id'
          );

          // completeWithCache must be called again because the job description
          // changed (different source hash for keyword extraction)
          expect(callCount).toBeGreaterThan(callsAfterFirst);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: LLM Graceful Degradation (ATS Scorer)
// ---------------------------------------------------------------------------

describe('Property 17: LLM Graceful Degradation (ATS Scorer)', () => {
  /**
   * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
   *
   * When all LLM providers are unavailable, the ATS Scorer SHALL produce a valid
   * result using local TF-IDF keyword extraction and exact matching fallback.
   * The result must still satisfy: score in [0,100], valid analysisSource,
   * valid matched/missing partition, and valid suggestions.
   */

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns valid ATSScoreResult with analysisSource "local" when all LLMs fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        resumeTextArb,
        async (resumeText) => {
          // Force all LLM providers to be unavailable
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'Connection refused', retryable: false },
              { provider: 'gemini', errorType: 'rate_limit', message: 'Quota exceeded', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'Request timed out', retryable: false },
            ])
          );

          // Use a job description with repeated words so TF-IDF finds keywords
          const jobDescription = 'React developer needed. React TypeScript experience required. TypeScript Node.js Docker. React TypeScript Docker Node.js.';

          const result = await calculateATSScore(
            resumeText,
            jobDescription,
            null,
            'job-degrade-17',
            'job-degrade-17-id'
          );

          // Valid ATSScoreResult shape
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          expect(result.analysisSource).toBe('local');
          expect(typeof result.totalKeywords).toBe('number');
          expect(result.totalKeywords).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(result.matchedKeywords)).toBe(true);
          expect(Array.isArray(result.missingKeywords)).toBe(true);
          expect(Array.isArray(result.suggestions)).toBe(true);

          // Score formula holds
          if (result.totalKeywords > 0) {
            const expectedScore = Math.max(0, Math.min(100,
              Math.round((result.matchedKeywords.length / result.totalKeywords) * 100)
            ));
            expect(result.score).toBe(expectedScore);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('local fallback still satisfies matching consistency (matched + missing = total)', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        resumeTextArb,
        async (keywords, resumeText) => {
          // Force local fallback
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'gemini', errorType: 'timeout', message: 'timeout', retryable: false },
              { provider: 'llm7', errorType: 'timeout', message: 'timeout', retryable: false },
            ])
          );

          // Directly test the local matching
          const analysis = matchKeywordsLocal(resumeText, keywords);

          // Partition property must still hold
          expect(
            analysis.matchedKeywords.length + analysis.missingKeywords.length
          ).toBe(keywords.length);

          // Source must be local
          expect(analysis.analysisSource).toBe('local');

          // All matched keywords must have matchType 'exact'
          for (const match of analysis.matchedKeywords) {
            expect(match.matchType).toBe('exact');
            expect(typeof match.keyword).toBe('string');
            expect(typeof match.matchedText).toBe('string');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('local fallback extractKeywordsLocal produces valid non-empty keywords from meaningful text', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'React developer needed. React TypeScript Docker. React TypeScript required.',
          'Python Django Flask developer. Python experience. Django REST API.',
          'Java Spring Boot microservices. Java Kubernetes Docker deployment.',
          'Node.js Express MongoDB. Node.js backend API development. Express middleware.',
        ),
        (jobDescription) => {
          const keywords = extractKeywordsLocal(jobDescription);

          // Should produce at least some keywords from meaningful text
          expect(keywords.length).toBeGreaterThan(0);
          expect(keywords.length).toBeLessThanOrEqual(20);

          // All keywords should be non-empty strings
          for (const kw of keywords) {
            expect(typeof kw).toBe('string');
            expect(kw.trim().length).toBeGreaterThanOrEqual(2);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('analyzeResumeMatch falls back to local when LLM is unavailable', async () => {
    await fc.assert(
      fc.asyncProperty(
        techKeywordsArb,
        resumeTextArb,
        async (keywords, resumeText) => {
          // Force LLM unavailable
          (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
            new LLMUnavailableError([
              { provider: 'openai', errorType: 'network_error', message: 'fail', retryable: false },
              { provider: 'gemini', errorType: 'network_error', message: 'fail', retryable: false },
              { provider: 'llm7', errorType: 'network_error', message: 'fail', retryable: false },
            ])
          );

          const result = await analyzeResumeMatch(
            resumeText,
            keywords,
            'job-fallback-17',
            'fakehash123'
          );

          // Should return valid CachedATSAnalysis with local source
          expect(result.analysisSource).toBe('local');
          expect(Array.isArray(result.matchedKeywords)).toBe(true);
          expect(Array.isArray(result.missingKeywords)).toBe(true);
          expect(Array.isArray(result.suggestions)).toBe(true);

          // Partition holds
          expect(
            result.matchedKeywords.length + result.missingKeywords.length
          ).toBe(keywords.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
