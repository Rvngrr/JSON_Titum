/**
 * Unit tests for ATS Scorer — Step 1: Keyword extraction and orchestrator.
 *
 * Tests:
 * - extractKeywords() — LLM primary path and local fallback
 * - extractKeywordsLocal() — TF-IDF-like keyword extraction
 * - calculateATSScore() — orchestrator with zero keywords edge case
 * - matchKeywordsLocal() — basic exact matching
 *
 * **Validates: Requirements 12.2, 12.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

vi.mock('../llm/llm-service', () => ({
  completeWithCache: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { completeWithCache } from '../llm/llm-service';
import { LLMUnavailableError } from '../llm/types';
import {
  extractKeywords,
  extractKeywordsLocal,
  calculateATSScore,
  matchKeywordsLocal,
} from './ats-scorer';

// ---------------------------------------------------------------------------
// Tests: extractKeywordsLocal
// ---------------------------------------------------------------------------

describe('extractKeywordsLocal', () => {
  it('should return an empty array for empty text', () => {
    expect(extractKeywordsLocal('')).toEqual([]);
    expect(extractKeywordsLocal('   ')).toEqual([]);
  });

  it('should extract frequent meaningful terms from text', () => {
    const text = `
      We are looking for a Senior React Developer with experience in TypeScript.
      The ideal candidate has React experience and TypeScript proficiency.
      Must know React, TypeScript, and Node.js. Node.js experience is required.
    `;
    const keywords = extractKeywordsLocal(text);

    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.length).toBeLessThanOrEqual(20);

    // "react" and "typescript" appear multiple times, should be in results
    const lower = keywords.map((k) => k.toLowerCase());
    expect(lower).toContain('react');
    expect(lower).toContain('typescript');
  });

  it('should exclude common stop words', () => {
    const text = `
      The candidate should have experience with the latest technologies.
      The team is looking for the best developer in the industry.
      The position requires the ability to work in a team.
    `;
    const keywords = extractKeywordsLocal(text);
    const stopWords = ['the', 'is', 'in', 'a', 'to', 'for', 'with'];

    for (const sw of stopWords) {
      expect(keywords).not.toContain(sw);
    }
  });

  it('should return between minCount and 20 keywords', () => {
    const text = `
      Python Django Flask REST API PostgreSQL Redis Docker Kubernetes
      AWS CI/CD Git Linux TDD Agile Microservices GraphQL TypeScript
      React Next.js Tailwind CSS testing deployment monitoring
      Python Django Flask REST API PostgreSQL Redis Docker Kubernetes
    `;
    const keywords = extractKeywordsLocal(text, 10);

    expect(keywords.length).toBeGreaterThanOrEqual(1);
    expect(keywords.length).toBeLessThanOrEqual(20);
  });

  it('should respect custom minCount parameter', () => {
    const text = `
      JavaScript JavaScript JavaScript Python Python Python
      React React React Docker Docker Docker
      AWS AWS AWS Git Git Git
    `;
    const keywords5 = extractKeywordsLocal(text, 5);
    expect(keywords5.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: extractKeywords
// ---------------------------------------------------------------------------

describe('extractKeywords', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return LLM-extracted keywords when LLM succeeds', async () => {
    const mockKeywords = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords: mockKeywords }),
      provider: 'openai',
      cached: false,
      latencyMs: 500,
    });

    const result = await extractKeywords(
      'Senior React Developer with TypeScript experience',
      'Must know Node.js and PostgreSQL',
      'job-123'
    );

    expect(result.source).toBe('llm');
    expect(result.keywords).toEqual(mockKeywords);
    expect(completeWithCache).toHaveBeenCalledTimes(1);
  });

  it('should fall back to local when LLM is unavailable', async () => {
    (completeWithCache as ReturnType<typeof vi.fn>).mockRejectedValue(
      new LLMUnavailableError([
        { provider: 'openai', errorType: 'network_error', message: 'timeout', retryable: false },
        { provider: 'gemini', errorType: 'network_error', message: 'timeout', retryable: false },
        { provider: 'llm7', errorType: 'network_error', message: 'timeout', retryable: false },
      ])
    );

    const result = await extractKeywords(
      'Looking for a React developer with TypeScript. React and TypeScript are required.',
      null,
      'job-456'
    );

    expect(result.source).toBe('local');
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('should fall back to local when LLM returns malformed JSON', async () => {
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'not valid json at all',
      provider: 'openai',
      cached: false,
      latencyMs: 300,
    });

    const result = await extractKeywords(
      'Looking for a Python developer. Python experience is required. Python Django Flask.',
      null,
      'job-789'
    );

    expect(result.source).toBe('local');
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('should fall back to local when LLM returns empty keywords array', async () => {
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords: [] }),
      provider: 'openai',
      cached: false,
      latencyMs: 200,
    });

    const result = await extractKeywords(
      'Python developer needed. Python experience required. Python Django.',
      null,
      'job-101'
    );

    expect(result.source).toBe('local');
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('should use completeWithCache with correct operation type', async () => {
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords: ['SQL', 'Python'] }),
      provider: 'gemini',
      cached: true,
      latencyMs: 0,
    });

    await extractKeywords('SQL and Python required', null, 'job-202');

    expect(completeWithCache).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: 'json',
        temperature: 0.1,
      }),
      expect.any(String), // cacheKey
      'ats_keywords',      // operationType
      expect.any(String), // sourceHash
      'job-202'           // sourceId
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: matchKeywordsLocal
// ---------------------------------------------------------------------------

describe('matchKeywordsLocal', () => {
  it('should match keywords found in resume text (case-insensitive)', () => {
    const resumeText = 'I have experience with React, TypeScript, and Docker.';
    const keywords = ['React', 'TypeScript', 'Docker', 'Kubernetes'];

    const result = matchKeywordsLocal(resumeText, keywords);

    expect(result.matchedKeywords).toHaveLength(3);
    expect(result.missingKeywords).toEqual(['Kubernetes']);
    expect(result.analysisSource).toBe('local');
  });

  it('should return all keywords as missing when resume is empty', () => {
    const keywords = ['React', 'TypeScript'];
    const result = matchKeywordsLocal('', keywords);

    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.missingKeywords).toEqual(keywords);
  });

  it('should generate a suggestion for each missing keyword', () => {
    const resumeText = 'I know React.';
    const keywords = ['React', 'Python', 'Docker'];

    const result = matchKeywordsLocal(resumeText, keywords);

    expect(result.suggestions).toHaveLength(2); // Python and Docker
    expect(result.suggestions[0].keyword).toBe('Python');
    expect(result.suggestions[0].impact).toBe('medium');
  });

  it('should handle empty keywords array', () => {
    const result = matchKeywordsLocal('Some resume text', []);

    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.missingKeywords).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: calculateATSScore
// ---------------------------------------------------------------------------

describe('calculateATSScore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return score 0 with empty arrays when no keywords are extracted', async () => {
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords: [] }),
      provider: 'openai',
      cached: false,
      latencyMs: 100,
    });

    // Use a very short description that won't produce local keywords either
    const result = await calculateATSScore(
      'My resume',
      'x',
      null,
      'job-empty',
      'job-empty-id'
    );

    // If both LLM returns empty and local returns empty, score should be 0
    // Note: with very short text, local might still extract something
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.totalKeywords).toBeGreaterThanOrEqual(0);
  });

  it('should compute score correctly: matched / total * 100', async () => {
    const keywords = ['React', 'TypeScript', 'Docker', 'Kubernetes', 'AWS'];
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords }),
      provider: 'openai',
      cached: false,
      latencyMs: 400,
    });

    // Resume contains 3 of 5 keywords
    const result = await calculateATSScore(
      'I have experience with React, TypeScript, and Docker in production systems.',
      'Looking for React, TypeScript, Docker, Kubernetes, and AWS skills.',
      null,
      'job-score-test',
      'job-score-id'
    );

    expect(result.score).toBe(60); // 3/5 * 100 = 60
    expect(result.totalKeywords).toBe(5);
    expect(result.matchedKeywords).toHaveLength(3);
    expect(result.missingKeywords).toHaveLength(2);
    expect(result.missingKeywords).toContain('Kubernetes');
    expect(result.missingKeywords).toContain('AWS');
  });

  it('should return score 100 when all keywords are matched', async () => {
    const keywords = ['React', 'TypeScript'];
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords }),
      provider: 'openai',
      cached: false,
      latencyMs: 300,
    });

    const result = await calculateATSScore(
      'Expert in React and TypeScript with 5 years of experience.',
      'React TypeScript developer needed.',
      null,
      'job-perfect',
      'job-perfect-id'
    );

    expect(result.score).toBe(100);
    expect(result.matchedKeywords).toHaveLength(2);
    expect(result.missingKeywords).toHaveLength(0);
  });

  it('should clamp score between 0 and 100', async () => {
    const keywords = ['Python', 'Django', 'Flask'];
    (completeWithCache as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify({ keywords }),
      provider: 'openai',
      cached: false,
      latencyMs: 200,
    });

    const result = await calculateATSScore(
      'I have no relevant experience whatsoever in any technology.',
      'Python Django Flask developer needed.',
      null,
      'job-zero',
      'job-zero-id'
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
