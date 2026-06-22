import { describe, it, expect } from 'vitest';
import { extractExperience } from './experience-extractor';
import type { WorkExperienceEntry } from './experience-extractor';

describe('Experience Extractor', () => {
  describe('extractExperience', () => {
    it('should return empty array for empty input', () => {
      const result = extractExperience([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for lines with no date patterns', () => {
      const lines = [
        'Some random text',
        'Another line without dates',
        'No experience here',
      ];
      const result = extractExperience(lines);
      expect(result).toEqual([]);
    });

    it('should extract entry with "Month Year - Present" format', () => {
      const lines = [
        'Software Engineer - Google Jan 2022 - Present',
        '• Led development of microservices architecture',
        '• Improved API performance by 40%',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Software Engineer');
      expect(result[0].company).toBe('Google');
      expect(result[0].startDate).toBe('Jan 2022');
      expect(result[0].endDate).toBe('Present');
      expect(result[0].isCurrent).toBe(true);
      expect(result[0].highlights).toHaveLength(2);
    });

    it('should extract entry with "Year - Year" format', () => {
      const lines = [
        'Product Manager at Amazon 2020 - 2023',
        '- Managed team of 12 engineers',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Product Manager');
      expect(result[0].company).toBe('Amazon');
      expect(result[0].startDate).toBe('2020');
      expect(result[0].endDate).toBe('2023');
      expect(result[0].isCurrent).toBe(false);
    });

    it('should extract entry with en-dash separator', () => {
      const lines = [
        'Data Scientist | Meta March 2021 – December 2022',
        '* Built ML models for recommendation engine',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Data Scientist');
      expect(result[0].company).toBe('Meta');
      expect(result[0].startDate).toBe('March 2021');
      expect(result[0].endDate).toBe('December 2022');
      expect(result[0].isCurrent).toBe(false);
    });

    it('should extract entry with "Current" keyword', () => {
      const lines = [
        'Senior Developer - Netflix Jan 2023 - Current',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(1);
      expect(result[0].isCurrent).toBe(true);
      expect(result[0].endDate).toBe('Current');
    });

    it('should separate title and company with " - " delimiter', () => {
      const lines = [
        'Senior Engineer - Microsoft 2020 - 2023',
      ];
      const result = extractExperience(lines);
      expect(result[0].title).toBe('Senior Engineer');
      expect(result[0].company).toBe('Microsoft');
    });

    it('should separate title and company with " | " delimiter', () => {
      const lines = [
        'Frontend Developer | Stripe 2019 - 2021',
      ];
      const result = extractExperience(lines);
      expect(result[0].title).toBe('Frontend Developer');
      expect(result[0].company).toBe('Stripe');
    });

    it('should separate title and company with " at " delimiter', () => {
      const lines = [
        'Backend Engineer at Spotify 2018 - 2020',
      ];
      const result = extractExperience(lines);
      expect(result[0].title).toBe('Backend Engineer');
      expect(result[0].company).toBe('Spotify');
    });

    it('should separate title and company with comma + capitalized word', () => {
      const lines = [
        'DevOps Lead, Amazon Web Services 2020 - 2022',
      ];
      const result = extractExperience(lines);
      expect(result[0].title).toBe('DevOps Lead');
      expect(result[0].company).toBe('Amazon Web Services');
    });

    it('should use entire text as title when no delimiter found', () => {
      const lines = [
        'Software Engineering Intern 2021 - 2022',
      ];
      const result = extractExperience(lines);
      expect(result[0].title).toBe('Software Engineering Intern');
      expect(result[0].company).toBe('');
    });

    it('should capture bullet points with • marker', () => {
      const lines = [
        'Engineer - Corp 2020 - 2021',
        '• Designed distributed system',
        '• Implemented caching layer',
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights).toEqual([
        'Designed distributed system',
        'Implemented caching layer',
      ]);
    });

    it('should capture bullet points with - marker', () => {
      const lines = [
        'Engineer - Corp 2020 - 2021',
        '- Designed distributed system',
        '- Implemented caching layer',
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights).toEqual([
        'Designed distributed system',
        'Implemented caching layer',
      ]);
    });

    it('should capture bullet points with * marker', () => {
      const lines = [
        'Engineer - Corp 2020 - 2021',
        '* Designed distributed system',
        '* Implemented caching layer',
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights).toEqual([
        'Designed distributed system',
        'Implemented caching layer',
      ]);
    });

    it('should capture numbered bullet points', () => {
      const lines = [
        'Engineer - Corp 2020 - 2021',
        '1. Designed distributed system',
        '2. Implemented caching layer',
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights).toEqual([
        'Designed distributed system',
        'Implemented caching layer',
      ]);
    });

    it('should truncate bullet points to 200 characters', () => {
      const longBullet = '• ' + 'A'.repeat(250);
      const lines = [
        'Engineer - Corp 2020 - 2021',
        longBullet,
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights[0].length).toBe(200);
    });

    it('should skip empty bullet points', () => {
      const lines = [
        'Engineer - Corp 2020 - 2021',
        '• ',
        '• Valid bullet',
      ];
      const result = extractExperience(lines);
      expect(result[0].highlights).toEqual(['Valid bullet']);
    });

    it('should extract multiple entries', () => {
      const lines = [
        'Senior Engineer - Google Jan 2022 - Present',
        '• Led team of 5',
        '',
        'Junior Engineer - Startup 2019 - 2021',
        '• Built web applications',
        '• Fixed critical bugs',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Senior Engineer');
      expect(result[0].company).toBe('Google');
      expect(result[0].highlights).toHaveLength(1);
      expect(result[1].title).toBe('Junior Engineer');
      expect(result[1].company).toBe('Startup');
      expect(result[1].highlights).toHaveLength(2);
    });

    it('should cap at 20 entries', () => {
      const lines: string[] = [];
      for (let i = 0; i < 25; i++) {
        lines.push(`Engineer ${i} - Corp${i} 20${String(i).padStart(2, '0')} - 2023`);
        lines.push('• Did work');
      }
      const result = extractExperience(lines);
      expect(result).toHaveLength(20);
    });

    it('should cap at 20 bullets per entry', () => {
      const lines: string[] = ['Engineer - Corp 2020 - 2021'];
      for (let i = 0; i < 25; i++) {
        lines.push(`• Bullet point ${i}`);
      }
      const result = extractExperience(lines);
      expect(result[0].highlights).toHaveLength(20);
    });

    it('should skip lines without date patterns between entries', () => {
      const lines = [
        'Senior Engineer - Google Jan 2022 - Present',
        '• Led team',
        'Some random text without dates',
        'Another line without date patterns',
        'Junior Engineer - Startup 2019 - 2021',
        '• Built apps',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(2);
    });

    it('should handle full month names', () => {
      const lines = [
        'Engineer - Corp January 2020 - December 2022',
      ];
      const result = extractExperience(lines);
      expect(result[0].startDate).toBe('January 2020');
      expect(result[0].endDate).toBe('December 2022');
    });

    it('should handle year-only dates with no space around dash', () => {
      const lines = [
        'Engineer - Corp 2020-2023',
      ];
      const result = extractExperience(lines);
      expect(result[0].startDate).toBe('2020');
      expect(result[0].endDate).toBe('2023');
    });

    it('should handle lines where date is at the beginning', () => {
      const lines = [
        '2020 - 2022 Software Engineer - Google',
      ];
      const result = extractExperience(lines);
      expect(result).toHaveLength(1);
      // The text after the date should be used as the header
      expect(result[0].title).toBe('Software Engineer');
      expect(result[0].company).toBe('Google');
    });
  });
});
