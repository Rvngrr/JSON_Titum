/**
 * LLM Service — provider-agnostic abstraction with cascading fallback.
 *
 * Supports OpenAI, Gemini, and LLM7 with automatic fallback logic.
 * Always requests structured JSON responses with low temperature for determinism.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import type { LLMConfig, LLMError, LLMProvider, LLMRequest, LLMResponse } from './types';
import { LLMUnavailableError } from './types';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: LLMConfig = {
  primaryProvider: 'openai',
  fallbackProviders: ['gemini', 'llm7'],
  timeout: 30000,
  maxRetries: 1,
};

// ---------------------------------------------------------------------------
// Supabase admin client (for cache reads/writes)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

/**
 * Calls OpenAI API.
 * Throws an LLMError-compatible error on failure.
 */
export async function callOpenAI(request: LLMRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createLLMError('openai', 'auth_error', 'OPENAI_API_KEY not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 429) {
        throw createLLMError('openai', 'rate_limit', `Rate limited: ${errorBody.substring(0, 200)}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw createLLMError('openai', 'auth_error', `Auth error [${response.status}]: ${errorBody.substring(0, 200)}`);
      }
      throw createLLMError('openai', 'network_error', `OpenAI error [${response.status}]: ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw createLLMError('openai', 'invalid_response', 'OpenAI returned an empty response');
    }

    return content;
  } catch (error: unknown) {
    if (isLLMError(error)) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createLLMError('openai', 'timeout', 'Request timed out after 30000ms');
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw createLLMError('openai', 'network_error', msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls Gemini API.
 * Throws an LLMError-compatible error on failure.
 */
export async function callGemini(request: LLMRequest): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw createLLMError('gemini', 'auth_error', 'GEMINI_API_KEY not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: request.systemPrompt ?? undefined,
      generationConfig: {
        temperature: request.temperature ?? 0.1,
        responseMimeType: 'application/json',
      },
    });

    const resultPromise = model.generateContent(request.prompt);

    // Race against timeout
    const result = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new DOMException('Timeout', 'AbortError')), DEFAULT_CONFIG.timeout);
        // Store the id so we can clear it
        controller.signal.addEventListener('abort', () => clearTimeout(id));
      }),
    ]);

    const text = result.response.text();

    if (!text) {
      throw createLLMError('gemini', 'invalid_response', 'Gemini returned an empty response');
    }

    return text;
  } catch (error: unknown) {
    if (isLLMError(error)) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createLLMError('gemini', 'timeout', 'Request timed out after 30000ms');
    }
    const msg = error instanceof Error ? error.message : String(error);
    // Gemini SDK throws errors with status info in the message
    if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
      throw createLLMError('gemini', 'rate_limit', msg);
    }
    if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('api key')) {
      throw createLLMError('gemini', 'auth_error', msg);
    }
    throw createLLMError('gemini', 'network_error', msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls LLM7 API (OpenAI-compatible endpoint).
 * Throws an LLMError-compatible error on failure.
 */
export async function callLLM7(request: LLMRequest): Promise<string> {
  const token = process.env.LLM7_TOKEN;
  if (!token) {
    throw createLLMError('llm7', 'auth_error', 'LLM7_TOKEN not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('https://api.llm7.io/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...(request.systemPrompt
            ? [{ role: 'system', content: request.systemPrompt }]
            : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature ?? 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 429) {
        throw createLLMError('llm7', 'rate_limit', `Rate limited: ${errorBody.substring(0, 200)}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw createLLMError('llm7', 'auth_error', `Auth error [${response.status}]: ${errorBody.substring(0, 200)}`);
      }
      throw createLLMError('llm7', 'network_error', `LLM7 error [${response.status}]: ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw createLLMError('llm7', 'invalid_response', 'LLM7 returned an empty response');
    }

    return content;
  } catch (error: unknown) {
    if (isLLMError(error)) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createLLMError('llm7', 'timeout', 'Request timed out after 30000ms');
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw createLLMError('llm7', 'network_error', msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/**
 * Calls the LLM with cascading fallback across configured providers.
 *
 * Tries primary provider first. If it fails with a rate limit, auth error, or
 * timeout, tries each fallback provider in order. Throws LLMUnavailableError
 * when all providers fail.
 */
export async function complete(
  request: LLMRequest,
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const mergedConfig: LLMConfig = { ...DEFAULT_CONFIG, ...config };
  const providers: LLMProvider[] = [
    mergedConfig.primaryProvider,
    ...mergedConfig.fallbackProviders,
  ];
  const errors: LLMError[] = [];

  for (const provider of providers) {
    const adapter = getProviderAdapter(provider);

    // Attempt with retry
    for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const content = await adapter(request);
        return {
          content,
          provider,
          cached: false,
          latencyMs: Date.now() - startTime,
        };
      } catch (error: unknown) {
        const llmError = toLLMError(error, provider);
        // Only retry on retryable errors
        if (attempt < mergedConfig.maxRetries && llmError.retryable) {
          continue;
        }
        errors.push(llmError);
        break; // Move to next provider
      }
    }
  }

  throw new LLMUnavailableError(errors);
}

/**
 * Checks the `llm_results_cache` table before making an LLM call.
 * On cache hit with matching source hash, returns cached result.
 * On cache miss or hash mismatch, makes a fresh LLM call and stores the result.
 */
export async function completeWithCache(
  request: LLMRequest,
  cacheKey: string,
  operationType: string,
  sourceHash: string,
  sourceId?: string,
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const supabase = getSupabaseAdmin();

  // Check cache
  const { data: cached } = await supabase
    .from('llm_results_cache')
    .select('result_json, provider, source_hash')
    .eq('cache_key', cacheKey)
    .eq('operation_type', operationType)
    .single();

  if (cached && cached.source_hash === sourceHash) {
    return {
      content: JSON.stringify(cached.result_json),
      provider: cached.provider as LLMProvider,
      cached: true,
      latencyMs: 0,
    };
  }

  // Cache miss or stale — call LLM
  const response = await complete(request, config);

  // Store result in cache
  let parsedResult: unknown;
  try {
    parsedResult = JSON.parse(response.content);
  } catch {
    // If the LLM response isn't valid JSON, store as-is in a wrapper
    parsedResult = { raw: response.content };
  }

  const cacheRecord = {
    cache_key: cacheKey,
    operation_type: operationType,
    source_id: sourceId ?? null,
    source_hash: sourceHash,
    result_json: parsedResult,
    provider: response.provider,
    updated_at: new Date().toISOString(),
  };

  if (cached) {
    // Update existing record
    await supabase
      .from('llm_results_cache')
      .update(cacheRecord)
      .eq('cache_key', cacheKey)
      .eq('operation_type', operationType);
  } else {
    // Insert new record
    await supabase
      .from('llm_results_cache')
      .insert({ ...cacheRecord, created_at: new Date().toISOString() });
  }

  return response;
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function getProviderAdapter(provider: LLMProvider): (request: LLMRequest) => Promise<string> {
  switch (provider) {
    case 'openai':
      return callOpenAI;
    case 'gemini':
      return callGemini;
    case 'llm7':
      return callLLM7;
  }
}

function createLLMError(
  provider: LLMProvider,
  errorType: LLMError['errorType'],
  message: string
): LLMError & Error {
  const error = new Error(message) as LLMError & Error;
  error.provider = provider;
  error.errorType = errorType;
  error.message = message;
  error.retryable = errorType === 'rate_limit' || errorType === 'timeout';
  return error;
}

function isLLMError(error: unknown): error is LLMError & Error {
  return (
    error instanceof Error &&
    'provider' in error &&
    'errorType' in error &&
    'retryable' in error
  );
}

function toLLMError(error: unknown, provider: LLMProvider): LLMError {
  if (isLLMError(error)) {
    return error;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return {
    provider,
    errorType: 'network_error',
    message: msg,
    retryable: false,
  };
}
