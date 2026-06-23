import { describe, it, expect } from 'vitest';
import {
  truncateTitle,
  sortAndCapRecommendations,
  generateAriaLabel,
} from './display-utils';
import type { CourseRecommendation } from './types';

describe('display-utils', () => {
  describe('truncateTitle', () => {
    it('returns title unchanged when 80 chars or fewer', () => {
      const title = 'Short Title';
      expect(truncateTitle(title)).toBe(title);
    });

    it('returns title unchanged when exactly 80 chars', () => {
      const title = 'a'.repeat(80);
      expect(truncateTitle(title)).toBe(title);
      expect(truncateTitle(title).length).toBe(80);
    });

    it('truncates title to 80 chars + "..." when over 80 chars', () => {
      const title = 'a'.repeat(100);
      const result = truncateTitle(title);
      expect(result.length).toBe(83);
      expect(result).toBe('a'.repeat(80) + '...');
    });

    it('handles empty string', () => {
      expect(truncateTitle('')).toBe('');
    });
  });

  describe('sortAndCapRecommendations', () => {
    const makeCourse = (title: string, impactScore: number): CourseRecommendation => ({
      title,
      platform: 'Coursera',
      url: 'https://coursera.org/learn/test',
      skill: 'Test',
      durationHours: 4,
      hasCertificate: true,
      impactScore,
    });

    it('sorts by impactScore descending', () => {
      const courses = [
        makeCourse('Low', 10),
        makeCourse('High', 90),
        makeCourse('Mid', 50),
      ];
      const result = sortAndCapRecommendations(courses);
      expect(result[0].title).toBe('High');
      expect(result[1].title).toBe('Mid');
      expect(result[2].title).toBe('Low');
    });

    it('caps at 10 items by default', () => {
      const courses = Array.from({ length: 15 }, (_, i) =>
        makeCourse(`Course ${i}`, i * 10)
      );
      const result = sortAndCapRecommendations(courses);
      expect(result.length).toBe(10);
    });

    it('caps at custom maxItems', () => {
      const courses = Array.from({ length: 10 }, (_, i) =>
        makeCourse(`Course ${i}`, i * 10)
      );
      const result = sortAndCapRecommendations(courses, 3);
      expect(result.length).toBe(3);
    });

    it('returns all items when fewer than maxItems', () => {
      const courses = [makeCourse('A', 80), makeCourse('B', 60)];
      const result = sortAndCapRecommendations(courses);
      expect(result.length).toBe(2);
    });

    it('does not mutate the original array', () => {
      const courses = [
        makeCourse('Low', 10),
        makeCourse('High', 90),
      ];
      sortAndCapRecommendations(courses);
      expect(courses[0].title).toBe('Low');
    });
  });

  describe('generateAriaLabel', () => {
    it('contains both title and platform name', () => {
      const result = generateAriaLabel('Python Basics', 'Coursera');
      expect(result).toContain('Python Basics');
      expect(result).toContain('Coursera');
    });

    it('uses truncated title when title exceeds 80 chars', () => {
      const longTitle = 'a'.repeat(100);
      const result = generateAriaLabel(longTitle, 'Udemy');
      expect(result).toContain('a'.repeat(80) + '...');
      expect(result).toContain('Udemy');
    });

    it('contains title unchanged when 80 chars or fewer', () => {
      const title = 'React for Beginners';
      const result = generateAriaLabel(title, 'edX');
      expect(result).toContain(title);
      expect(result).toContain('edX');
    });
  });
});
