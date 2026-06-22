/**
 * Unit tests for LLM utility functions (computeHash, buildCacheKey).
 *
 * **Validates: Requirements 4.1, 11.1, 12.2, 12.7**
 */

import { describe, it, expect } from 'vitest';
import { computeHash, buildCacheKey } from './utils';

describe('computeHash', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const result = computeHash('hello world');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns deterministic results for the same input', () => {
    const hash1 = computeHash('test input');
    const hash2 = computeHash('test input');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different inputs', () => {
    const hash1 = computeHash('input A');
    const hash2 = computeHash('input B');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const result = computeHash('');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles unicode text', () => {
    const result = computeHash('日本語テスト 🎉');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces known SHA-256 for well-known input', () => {
    // SHA-256 of empty string is well-known
    const emptyHash = computeHash('');
    expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('buildCacheKey', () => {
  it('returns a 64-character hex string', () => {
    const result = buildCacheKey('part1', 'part2');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns deterministic results for the same parts', () => {
    const key1 = buildCacheKey('resume_hash', 'job_123', 'ats_analysis');
    const key2 = buildCacheKey('resume_hash', 'job_123', 'ats_analysis');
    expect(key1).toBe(key2);
  });

  it('returns different keys when parts differ', () => {
    const key1 = buildCacheKey('hash_A', 'job_1');
    const key2 = buildCacheKey('hash_B', 'job_1');
    expect(key1).not.toBe(key2);
  });

  it('is order-sensitive', () => {
    const key1 = buildCacheKey('a', 'b');
    const key2 = buildCacheKey('b', 'a');
    expect(key1).not.toBe(key2);
  });

  it('handles single part', () => {
    const result = buildCacheKey('only_one');
    expect(result).toHaveLength(64);
  });

  it('joins parts with :: separator before hashing', () => {
    // buildCacheKey('a', 'b') should equal computeHash('a::b')
    const fromBuild = buildCacheKey('a', 'b');
    const fromCompute = computeHash('a::b');
    expect(fromBuild).toBe(fromCompute);
  });
});
