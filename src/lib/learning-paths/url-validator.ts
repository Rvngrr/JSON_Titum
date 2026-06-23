/**
 * URL Validator Module for Learning Paths
 *
 * Validates course URLs against approved domain and path prefix patterns
 * to ensure all recommendations link to legitimate learning platforms.
 *
 * @see Requirements 7.2, 7.3
 */

import { APPROVED_URL_PATTERNS } from './types';

/**
 * Validates that a URL starts with `https://` and matches one of the
 * approved domain + path prefix combinations from APPROVED_URL_PATTERNS.
 *
 * A URL is considered valid if:
 * 1. It starts with "https://"
 * 2. The remaining portion contains one of the approved domain strings
 *    immediately followed by the corresponding path prefix
 *
 * @param url - The URL string to validate
 * @returns true if the URL is a valid approved course URL, false otherwise
 */
export function isValidCourseUrl(url: string): boolean {
  if (!url.startsWith('https://')) {
    return false;
  }

  return APPROVED_URL_PATTERNS.some((pattern) => {
    const domainPathCombo = `${pattern.domain}${pattern.pathPrefix}`;
    return url.includes(domainPathCombo);
  });
}

/**
 * Filters an array of URLs, returning only those that pass validation
 * against the approved domain and path prefix patterns.
 *
 * @param urls - Array of URL strings to filter
 * @returns Array containing only valid approved course URLs
 */
export function filterValidUrls(urls: string[]): string[] {
  return urls.filter(isValidCourseUrl);
}
