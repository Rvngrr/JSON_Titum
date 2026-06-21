/**
 * LLM utility functions.
 *
 * Provides helpers for generating cache keys and source hashes
 * used by the LLM caching layer (completeWithCache).
 */

import { createHash } from 'crypto';

/**
 * Computes a SHA-256 hash of the given text.
 *
 * Used to generate:
 * - Cache keys (e.g., hash of job description + operation type)
 * - Source hashes (to detect when source content changes for cache invalidation)
 *
 * @param text - The input text to hash
 * @returns Hex-encoded SHA-256 digest
 */
export function computeHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Builds a composite cache key by hashing multiple parts together.
 *
 * Useful for operations keyed by multiple inputs, e.g.:
 * - ATS analysis: `buildCacheKey(resumeHash, jobId, 'ats_analysis')`
 * - Skill extraction: `buildCacheKey(jobDescriptionText, 'skill_extraction')`
 *
 * @param parts - One or more strings to combine into a cache key
 * @returns Hex-encoded SHA-256 digest of the joined parts
 */
export function buildCacheKey(...parts: string[]): string {
  return computeHash(parts.join('::'));
}
