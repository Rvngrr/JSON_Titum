/**
 * Property-based tests for LLM Service.
 *
 * Tests the core LLM service behavior: cascading fallback, cache idempotence,
 * cache invalidation on source change, and JSON parsing robustness.
 *
 * **Validates: Requirements 4.1, 11.1, 12.2**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import type { LLMRequest, LLMResponse, LLMProvider } from './types';
import { LLMUnavailableError } from './types';

// ---------------------------------------------------------------------------
// Mock setup — we mock the provider adapters and Supabase client
// ---------------------------------------------------------------------------

// We'll mock the entire module and control individual exports
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

// Store references to mocked provider adapters
let mockCallOpenAI: ReturnType<typeof vi.fn>;
let mockCallGemini: ReturnType<typeof vi.fn>;
let mockCallLLM7: ReturnType<typeof vi.fn>;
let mockSupabaseFrom: ReturnType<typeof vi.fn>;
let mockSupabaseSelect: ReturnType<typeof vi.fn>;
let mockSupabaseInsert: ReturnType<typeof vi.fn>;
let mockSupabaseUpdate: ReturnType<typeof vi.fn>;
let mockSupabaseEq: ReturnType<typeof vi.fn>;
let mockSupabaseSingle: ReturnType<typeof vi.fn>;

// We'll dynamically import to get the mocked module
let complete: typeof import('./llm-service').complete;
let completeWithCache: typeof import('./llm-service').completeWithCache;

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();

  // Setup env vars
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.LLM7_TOKEN = 'test-llm7-token';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  // Setup Supabase mock chain
  mockSupabaseSingle = vi.fn();
  mockSupabaseEq = vi.fn().mockReturnThis();
  mockSupabaseSelect = vi.fn().mockReturnValue({ eq: mockSupabaseEq });
  mockSupabaseInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  mockSupabaseUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }) });
  mockSupabaseFrom = vi.fn().mockReturnValue({
    select: mockSupabaseSelect,
    insert: mockSupabaseInsert,
    update: mockSupabaseUpdate,
  });

  const { createClient } = await import('@supabase/supabase-js');
  (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
    from: mockSupabaseFrom,
  });

  // Setup mock fetch for provider adapters
  mockCallOpenAI = vi.fn();
  mockCallGemini = vi.fn();
  mockCallLLM7 = vi.fn();

  // Mock global fetch — used by callOpenAI and callLLM7
  global.fetch = vi.fn();

  // Import module fresh with mocks in place
  const llmService = await import('./llm-service');
  complete = llmService.complete;
  completeWithCache = llmService.completeWithCache;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM7_TOKEN;
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a valid LLM request */
const llmRequestArb = fc.record({
  prompt: fc.string({ minLength: 1, maxLength: 200 }),
  systemPrompt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  responseFormat: fc.constant('json' as const),
  temperature: fc.option(fc.double({ min: 0, max: 2, noNaN: true }), { nil: undefined }),
});

/** Generate a valid JSON content string (simulates LLM response) */
const validJsonContentArb = fc.oneof(
  fc.json().map((j) => j),
  fc.array(fc.record({
    skillName: fc.string({ minLength: 1, maxLength: 30 }),
    importance: fc.constantFrom('required', 'preferred'),
    rawText: fc.string({ minLength: 1, maxLength: 100 }),
  }), { minLength: 1, maxLength: 5 }).map((arr) => JSON.stringify(arr))
);

/** Generate a provider name */
const providerArb = fc.constantFrom<LLMProvider>('openai', 'gemini', 'llm7');

/** Generate a source hash (hex string simulating SHA-256) */
const hexCharArb = fc.constantFrom(...'0123456789abcdef'.split(''));
const sourceHashArb = fc.array(hexCharArb, { minLength: 64, maxLength: 64 }).map(arr => arr.join(''));

/** Generate a cache key */
const cacheKeyArb = fc.string({ minLength: 5, maxLength: 80 });

/** Generate an operation type */
const operationTypeArb = fc.constantFrom('skill_extraction', 'proficiency_analysis', 'ats_keywords', 'ats_analysis');

/** Generate malformed/non-JSON strings (always non-empty to avoid empty response errors) */
const malformedJsonArb = fc.oneof(
  fc.string({ minLength: 2, maxLength: 100 }).filter((s) => {
    try { JSON.parse(s); return false; } catch { return true; }
  }),
  fc.constant('not json at all'),
  fc.constant('{invalid: json}'),
  fc.constant('<html>error page</html>'),
  fc.constant('undefined response data'),
);

// ---------------------------------------------------------------------------
// Helper to make fetch mock return provider responses
// ---------------------------------------------------------------------------

function makeFetchSuccess(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
    text: () => Promise.resolve(content),
  });
}

function makeFetchError(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
}

// ---------------------------------------------------------------------------
// Property 15: LLM Provider Fallback Correctness
// ---------------------------------------------------------------------------

describe('Property 15: LLM Provider Fallback Correctness', () => {
  /**
   * **Validates: Requirements 4.1, 11.1, 12.2**
   *
   * For any sequence of LLM requests where the primary provider returns a rate
   * limit or error response, the LLM Service SHALL attempt the next fallback
   * provider in order. For any sequence where at least one provider returns a
   * valid response, the overall request SHALL succeed with that provider's response.
   */

  it('should try fallback providers when primary fails, succeeding when at least one works', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        validJsonContentArb,
        fc.integer({ min: 0, max: 2 }), // index of provider that succeeds
        async (request, validContent, successIdx) => {
          // Reset fetch mock for each property run
          const providers: LLMProvider[] = ['openai', 'gemini', 'llm7'];
          let callCount = 0;

          // Mock fetch to fail for providers before successIdx, succeed at successIdx
          (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
            const currentCall = callCount++;
            if (currentCall < successIdx) {
              // Fail with rate limit (retryable - will be retried once then move on)
              return { ok: false, status: 429, text: () => Promise.resolve('rate limited') };
            }
            // Succeed
            return {
              ok: true,
              json: () => Promise.resolve({ choices: [{ message: { content: validContent } }] }),
              text: () => Promise.resolve(validContent),
            };
          });

          // For Gemini at successIdx, we need to handle it differently since it uses the SDK
          // Let's configure to skip gemini and only use openai/llm7 for simpler testing
          const config = {
            primaryProvider: 'openai' as LLMProvider,
            fallbackProviders: ['llm7'] as LLMProvider[],
            timeout: 30000,
            maxRetries: 0, // No retries to simplify fallback testing
          };

          if (successIdx === 0) {
            // Primary succeeds
            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
              ok: true,
              json: () => Promise.resolve({ choices: [{ message: { content: validContent } }] }),
              text: () => Promise.resolve(validContent),
            });

            const result = await complete(request, config);
            expect(result.provider).toBe('openai');
            expect(result.content).toBe(validContent);
          } else {
            // Primary fails, fallback succeeds
            (global.fetch as ReturnType<typeof vi.fn>)
              .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited') })
              .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: validContent } }] }),
                text: () => Promise.resolve(validContent),
              });

            const result = await complete(request, config);
            expect(result.provider).toBe('llm7');
            expect(result.content).toBe(validContent);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should throw LLMUnavailableError when ALL providers fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        async (request) => {
          const config = {
            primaryProvider: 'openai' as LLMProvider,
            fallbackProviders: ['llm7'] as LLMProvider[],
            timeout: 30000,
            maxRetries: 0,
          };

          // All providers fail
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve('internal server error'),
          });

          try {
            await complete(request, config);
            // Should not reach here
            expect.fail('Expected LLMUnavailableError to be thrown');
          } catch (error: unknown) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).name).toBe('LLMUnavailableError');
            expect((error as { errors: unknown[] }).errors).toBeInstanceOf(Array);
            expect((error as { errors: unknown[] }).errors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: LLM Result Cache Idempotence
// ---------------------------------------------------------------------------

describe('Property 16: LLM Result Cache Idempotence', () => {
  /**
   * **Validates: Requirements 4.1, 11.1, 12.2**
   *
   * For any identical source data (same job description text or same resume text),
   * calling the LLM-powered extraction a second time SHALL return the cached result
   * without making a new LLM API call. The cached result SHALL be byte-equivalent
   * to the first call's result.
   */

  it('should return cached result without LLM call when cache hit with matching source hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        cacheKeyArb,
        operationTypeArb,
        sourceHashArb,
        validJsonContentArb,
        providerArb,
        async (request, cacheKey, opType, sourceHash, cachedContent, cachedProvider) => {
          let parsedContent: unknown;
          try {
            parsedContent = JSON.parse(cachedContent);
          } catch {
            parsedContent = { raw: cachedContent };
          }

          // Configure Supabase to return a cache hit
          const mockEqChain = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  result_json: parsedContent,
                  provider: cachedProvider,
                  source_hash: sourceHash, // matching hash
                },
                error: null,
              }),
            }),
          });

          mockSupabaseSelect.mockReturnValue({ eq: mockEqChain });

          // Fetch should NOT be called (cache hit)
          (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
            new Error('fetch should not be called on cache hit')
          );

          const result = await completeWithCache(request, cacheKey, opType, sourceHash);

          // Verify cache hit behavior
          expect(result.cached).toBe(true);
          expect(result.provider).toBe(cachedProvider);
          expect(result.latencyMs).toBe(0);
          expect(result.content).toBe(JSON.stringify(parsedContent));
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: LLM Cache Invalidation on Source Change
// ---------------------------------------------------------------------------

describe('Property 18: LLM Cache Invalidation on Source Change', () => {
  /**
   * **Validates: Requirements 4.1, 11.1, 12.2**
   *
   * For any source data that has been previously cached, if the source text changes
   * (different SHA-256 hash), the next extraction call SHALL make a fresh LLM
   * request and update the cache, rather than returning the stale cached result.
   */

  it('should make fresh LLM call when source hash differs from cached hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        cacheKeyArb,
        operationTypeArb,
        sourceHashArb,
        sourceHashArb,
        validJsonContentArb,
        validJsonContentArb,
        async (request, cacheKey, opType, oldHash, newHash, cachedContent, freshContent) => {
          // Ensure hashes are actually different
          fc.pre(oldHash !== newHash);

          let parsedCachedContent: unknown;
          try {
            parsedCachedContent = JSON.parse(cachedContent);
          } catch {
            parsedCachedContent = { raw: cachedContent };
          }

          // Configure Supabase to return cached entry with OLD hash
          const mockEqOp = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                result_json: parsedCachedContent,
                provider: 'openai',
                source_hash: oldHash, // does NOT match newHash
              },
              error: null,
            }),
          });
          const mockEqCache = vi.fn().mockReturnValue({ eq: mockEqOp });
          mockSupabaseSelect.mockReturnValue({ eq: mockEqCache });

          // Mock update for cache store
          const mockUpdateEq2 = vi.fn().mockResolvedValue({ data: null, error: null });
          const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });
          mockSupabaseUpdate.mockReturnValue({ eq: mockUpdateEq1 });

          // Configure fetch to succeed with fresh content (OpenAI)
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: freshContent } }] }),
            text: () => Promise.resolve(freshContent),
          });

          const config = {
            primaryProvider: 'openai' as LLMProvider,
            fallbackProviders: [] as LLMProvider[],
            timeout: 30000,
            maxRetries: 0,
          };

          const result = await completeWithCache(request, cacheKey, opType, newHash, undefined, config);

          // Should NOT return the cached result — should have called the LLM
          expect(result.cached).toBe(false);
          expect(result.content).toBe(freshContent);
          expect(result.provider).toBe('openai');

          // Verify Supabase update was called (cache was refreshed)
          expect(mockSupabaseUpdate).toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 19: LLM Response JSON Parsing Robustness
// ---------------------------------------------------------------------------

describe('Property 19: LLM Response JSON Parsing Robustness', () => {
  /**
   * **Validates: Requirements 4.1, 11.1, 12.2**
   *
   * For any malformed or non-JSON LLM response, the completeWithCache function
   * SHALL still store the result (wrapped in a {raw: ...} object) rather than
   * throwing an unhandled error. Callers can then detect the malformed response
   * and trigger local fallback.
   */

  it('should wrap malformed JSON responses in a {raw: ...} object and store in cache', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        cacheKeyArb,
        operationTypeArb,
        sourceHashArb,
        malformedJsonArb,
        async (request, cacheKey, opType, sourceHash, malformedContent) => {
          // No cache exists
          const mockEqOp = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          });
          const mockEqCache = vi.fn().mockReturnValue({ eq: mockEqOp });
          mockSupabaseSelect.mockReturnValue({ eq: mockEqCache });

          // Mock insert for cache store
          mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

          // Configure fetch to return the malformed content (OpenAI response)
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: malformedContent } }] }),
            text: () => Promise.resolve(malformedContent),
          });

          const config = {
            primaryProvider: 'openai' as LLMProvider,
            fallbackProviders: [] as LLMProvider[],
            timeout: 30000,
            maxRetries: 0,
          };

          // Should NOT throw — malformed JSON is handled gracefully
          const result = await completeWithCache(request, cacheKey, opType, sourceHash, undefined, config);

          // The raw content is returned to the caller
          expect(result.content).toBe(malformedContent);
          expect(result.cached).toBe(false);

          // Verify the insert was called with a wrapped object
          expect(mockSupabaseInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              cache_key: cacheKey,
              operation_type: opType,
              source_hash: sourceHash,
              result_json: { raw: malformedContent },
              provider: 'openai',
            })
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly parse valid JSON responses and store parsed object in cache', async () => {
    await fc.assert(
      fc.asyncProperty(
        llmRequestArb,
        cacheKeyArb,
        operationTypeArb,
        sourceHashArb,
        fc.array(fc.record({
          skillName: fc.string({ minLength: 1, maxLength: 20 }),
          importance: fc.constantFrom('required', 'preferred'),
          rawText: fc.string({ minLength: 1, maxLength: 50 }),
        }), { minLength: 1, maxLength: 5 }),
        async (request, cacheKey, opType, sourceHash, skills) => {
          const validJsonContent = JSON.stringify(skills);

          // No cache exists
          const mockEqOp = vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          });
          const mockEqCache = vi.fn().mockReturnValue({ eq: mockEqOp });
          mockSupabaseSelect.mockReturnValue({ eq: mockEqCache });

          // Mock insert for cache store
          mockSupabaseInsert.mockResolvedValue({ data: null, error: null });

          // Configure fetch to return valid JSON
          (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: validJsonContent } }] }),
            text: () => Promise.resolve(validJsonContent),
          });

          const config = {
            primaryProvider: 'openai' as LLMProvider,
            fallbackProviders: [] as LLMProvider[],
            timeout: 30000,
            maxRetries: 0,
          };

          const result = await completeWithCache(request, cacheKey, opType, sourceHash, undefined, config);

          expect(result.content).toBe(validJsonContent);

          // Verify the insert stores the PARSED object (not wrapped in {raw})
          expect(mockSupabaseInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              result_json: skills, // Parsed object, not {raw: ...}
            })
          );
        }
      ),
      { numRuns: 30 }
    );
  });
});
