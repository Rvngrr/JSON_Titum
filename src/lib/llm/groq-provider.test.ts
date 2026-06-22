/**
 * Unit tests for Groq Provider.
 *
 * Tests error handling, timeout behavior, and successful API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LLMError, LLMRequest } from './types';

let callGroq: typeof import('./groq-provider').callGroq;

const baseRequest: LLMRequest = {
  prompt: 'Extract skills from this resume',
  systemPrompt: 'You are a helpful assistant',
  responseFormat: 'json',
  temperature: 0.1,
};

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  process.env.GROQ_API_KEY = 'test-groq-key';
  global.fetch = vi.fn();
  const mod = await import('./groq-provider');
  callGroq = mod.callGroq;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GROQ_API_KEY;
});

describe('callGroq', () => {
  it('should return content on successful API call', async () => {
    const expectedContent = JSON.stringify({ skills: ['TypeScript', 'React'] });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: expectedContent } }],
      }),
    });

    const result = await callGroq(baseRequest);
    expect(result).toBe(expectedContent);
  });

  it('should send correct headers and body to Groq API', async () => {
    const mockContent = '{"result": "test"}';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: mockContent } }],
      }),
    });

    await callGroq(baseRequest);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-groq-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Extract skills from this resume' },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      })
    );
  });

  it('should omit system message when systemPrompt is not provided', async () => {
    const mockContent = '{"result": "test"}';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: mockContent } }],
      }),
    });

    await callGroq({ prompt: 'Hello', responseFormat: 'json' });

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('should throw auth_error when GROQ_API_KEY is not set', async () => {
    delete process.env.GROQ_API_KEY;
    // Re-import to pick up missing env var
    vi.resetModules();
    const mod = await import('./groq-provider');

    try {
      await mod.callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('auth_error');
      expect(llmErr.retryable).toBe(false);
      expect(llmErr.message).toContain('GROQ_API_KEY not set');
    }
  });

  it('should throw rate_limit error on 429 response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Too many requests'),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('rate_limit');
      expect(llmErr.retryable).toBe(true);
    }
  });

  it('should throw auth_error on 401 response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Invalid API key'),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('auth_error');
      expect(llmErr.retryable).toBe(false);
    }
  });

  it('should throw auth_error on 403 response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('auth_error');
      expect(llmErr.retryable).toBe(false);
    }
  });

  it('should throw timeout error when request exceeds 10 seconds', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, options: { signal: AbortSignal }) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      }
    );

    // Use fake timers to avoid waiting 10 real seconds
    vi.useFakeTimers();

    const promise = callGroq(baseRequest);
    vi.advanceTimersByTime(10000);

    try {
      await promise;
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('timeout');
      expect(llmErr.retryable).toBe(true);
      expect(llmErr.message).toContain('10000');
    }

    vi.useRealTimers();
  });

  it('should throw invalid_response when choices is empty', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('invalid_response');
      expect(llmErr.retryable).toBe(false);
    }
  });

  it('should throw invalid_response when content is null', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: null } }],
      }),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('invalid_response');
      expect(llmErr.retryable).toBe(false);
    }
  });

  it('should throw network_error for other HTTP errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error'),
    });

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('network_error');
      expect(llmErr.retryable).toBe(false);
    }
  });

  it('should throw network_error when fetch rejects with a network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network connection failed')
    );

    try {
      await callGroq(baseRequest);
      expect.fail('Should have thrown');
    } catch (error) {
      const llmErr = error as LLMError & Error;
      expect(llmErr.provider).toBe('groq');
      expect(llmErr.errorType).toBe('network_error');
      expect(llmErr.retryable).toBe(false);
      expect(llmErr.message).toContain('Network connection failed');
    }
  });

  it('should use default temperature of 0.1 when not specified', async () => {
    const mockContent = '{"result": "test"}';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: mockContent } }],
      }),
    });

    await callGroq({ prompt: 'Test', responseFormat: 'json' });

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.temperature).toBe(0.1);
  });
});
