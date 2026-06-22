/**
 * Groq LLM Provider — uses Llama 3.3 70B via Groq's OpenAI-compatible API.
 *
 * Authenticates via the GROQ_API_KEY environment variable.
 * Enforces a 10-second timeout per request.
 */

import type { LLMError, LLMRequest } from './types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 10000;

/**
 * Calls Groq API with Llama 3.3 70B. Throws LLMError on failure.
 */
export async function callGroq(request: LLMRequest): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw createGroqError('auth_error', 'GROQ_API_KEY not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
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
        throw createGroqError('rate_limit', `Rate limited: ${errorBody.substring(0, 200)}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw createGroqError('auth_error', `Auth error [${response.status}]: ${errorBody.substring(0, 200)}`);
      }
      throw createGroqError('network_error', `Groq error [${response.status}]: ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw createGroqError('invalid_response', 'Groq returned an empty response');
    }

    return content;
  } catch (error: unknown) {
    if (isGroqLLMError(error)) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createGroqError('timeout', `Request timed out after ${GROQ_TIMEOUT_MS}ms`);
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw createGroqError('network_error', msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGroqError(
  errorType: LLMError['errorType'],
  message: string
): LLMError & Error {
  const error = new Error(message) as LLMError & Error;
  error.provider = 'groq';
  error.errorType = errorType;
  error.message = message;
  error.retryable = errorType === 'rate_limit' || errorType === 'timeout';
  return error;
}

function isGroqLLMError(error: unknown): error is LLMError & Error {
  return (
    error instanceof Error &&
    'provider' in error &&
    'errorType' in error &&
    'retryable' in error
  );
}
