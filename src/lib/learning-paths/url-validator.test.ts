import { describe, it, expect } from 'vitest';
import { isValidCourseUrl, filterValidUrls } from './url-validator';

describe('url-validator', () => {
  describe('isValidCourseUrl', () => {
    it('accepts valid Coursera URL', () => {
      expect(isValidCourseUrl('https://coursera.org/learn/python')).toBe(true);
    });

    it('accepts valid Udemy URL', () => {
      expect(isValidCourseUrl('https://udemy.com/course/react-complete')).toBe(true);
    });

    it('accepts valid DataCamp URL', () => {
      expect(isValidCourseUrl('https://datacamp.com/courses/intro-to-sql')).toBe(true);
    });

    it('accepts valid LinkedIn Learning URL', () => {
      expect(isValidCourseUrl('https://linkedin.com/learning/javascript-essentials')).toBe(true);
    });

    it('accepts valid edX URL', () => {
      expect(isValidCourseUrl('https://edx.org/learn/data-science')).toBe(true);
    });

    it('accepts valid Pluralsight URL', () => {
      expect(isValidCourseUrl('https://pluralsight.com/courses/typescript-fundamentals')).toBe(true);
    });

    it('accepts valid Codecademy URL', () => {
      expect(isValidCourseUrl('https://codecademy.com/learn/intro-to-python')).toBe(true);
    });

    it('accepts URL with www. prefix', () => {
      expect(isValidCourseUrl('https://www.coursera.org/learn/ml-foundations')).toBe(true);
    });

    it('rejects URL with http:// (not https)', () => {
      expect(isValidCourseUrl('http://coursera.org/learn/python')).toBe(false);
    });

    it('rejects URL with unapproved domain', () => {
      expect(isValidCourseUrl('https://malicious-site.com/learn/fake')).toBe(false);
    });

    it('rejects URL with correct domain but wrong path prefix', () => {
      expect(isValidCourseUrl('https://coursera.org/about/team')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidCourseUrl('')).toBe(false);
    });

    it('rejects non-URL string', () => {
      expect(isValidCourseUrl('not a url at all')).toBe(false);
    });

    it('rejects URL without protocol', () => {
      expect(isValidCourseUrl('coursera.org/learn/python')).toBe(false);
    });
  });

  describe('filterValidUrls', () => {
    it('returns only valid URLs from a mixed array', () => {
      const urls = [
        'https://coursera.org/learn/python',
        'http://coursera.org/learn/python',
        'https://malicious.com/steal-data',
        'https://udemy.com/course/react',
        'https://edx.org/learn/ai',
        'not-a-url',
      ];

      const result = filterValidUrls(urls);

      expect(result).toEqual([
        'https://coursera.org/learn/python',
        'https://udemy.com/course/react',
        'https://edx.org/learn/ai',
      ]);
    });

    it('returns empty array when no URLs are valid', () => {
      const urls = [
        'http://coursera.org/learn/python',
        'https://evil.com/phishing',
        'ftp://datacamp.com/courses/sql',
      ];

      expect(filterValidUrls(urls)).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      expect(filterValidUrls([])).toEqual([]);
    });

    it('returns all URLs when all are valid', () => {
      const urls = [
        'https://coursera.org/learn/python',
        'https://udemy.com/course/react',
        'https://codecademy.com/learn/javascript',
      ];

      expect(filterValidUrls(urls)).toEqual(urls);
    });
  });
});
