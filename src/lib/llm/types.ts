/**
 * Supported LLM providers.
 */
export type LLMProvider = 'openai' | 'gemini' | 'llm7';

/**
 * Configuration for the LLM service including fallback behavior.
 */
export interface LLMConfig {
  primaryProvider: LLMProvider;
  fallbackProviders: LLMProvider[];
  /** Per-request timeout in ms (default: 30000) */
  timeout: number;
  /** Retries per provider (default: 1) */
  maxRetries: number;
}

/**
 * A request to the LLM service.
 */
export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  /** Always request structured JSON responses */
  responseFormat: 'json';
  /** Default: 0.1 for deterministic outputs */
  temperature?: number;
}

/**
 * A successful response from the LLM service.
 */
export interface LLMResponse {
  /** Raw JSON string from the model */
  content: string;
  /** Which provider actually served the response */
  provider: LLMProvider;
  /** Whether result came from cache */
  cached: boolean;
  latencyMs: number;
}

/**
 * Structured error from an LLM provider.
 */
export interface LLMError {
  provider: LLMProvider;
  errorType: 'rate_limit' | 'auth_error' | 'timeout' | 'invalid_response' | 'network_error';
  message: string;
  retryable: boolean;
}

/**
 * Error thrown when all LLM providers are unavailable.
 * Callers should handle graceful degradation to local algorithms.
 */
export class LLMUnavailableError extends Error {
  public readonly errors: LLMError[];

  constructor(errors: LLMError[]) {
    const providers = errors.map((e) => e.provider).join(', ');
    super(`All LLM providers unavailable: ${providers}`);
    this.name = 'LLMUnavailableError';
    this.errors = errors;
  }
}
