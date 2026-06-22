import { describe, it, expect } from 'vitest';
import { extractEducation, EducationEntry } from './education-extractor';

describe('extractEducation', () => {
  describe('degree keyword detection', () => {
    it('detects Bachelor degree keyword', () => {
      const lines = ['Bachelor of Science in Computer Science, MIT, 2020'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Bachelor');
    });

    it('detects Master degree keyword', () => {
      const lines = ["Master's in Data Science - Stanford University 2022"];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Master');
    });

    it('detects Ph.D. degree keyword', () => {
      const lines = ['Ph.D. in Physics - Harvard University 2021'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Ph.D.');
    });

    it('detects B.S. abbreviation', () => {
      const lines = ['B.S. Computer Science | University of Texas 2019'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('B.S.');
    });

    it('detects M.S. abbreviation', () => {
      const lines = ['M.S. in Machine Learning, Carnegie Mellon 2023'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('M.S.');
    });

    it('detects Associate degree', () => {
      const lines = ['Associate of Arts - Community College 2018'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Associate');
    });

    it('detects Diploma', () => {
      const lines = ['Diploma in Web Development, Tech Academy 2020'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Diploma');
    });

    it('detects Doctor/Doctorate', () => {
      const lines = ['Doctorate in Education - Columbia University 2019'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toContain('Doctorate');
    });
  });

  describe('date range parsing', () => {
    it('extracts end year from date range "2019 - 2023"', () => {
      const lines = ['Bachelor of Science 2019 - 2023'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('2023');
    });

    it('extracts end year from en-dash range "2019 – 2023"', () => {
      const lines = ['Bachelor of Science 2019 – 2023'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('2023');
    });

    it('extracts single year as graduation year', () => {
      const lines = ['Bachelor of Science, MIT 2020'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('2020');
    });

    it('extracts start year when end is "Present"', () => {
      const lines = ['Master of Business Administration 2022 - Present'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('2022');
    });

    it('handles month-year date ranges', () => {
      const lines = ['Bachelor of Arts Jan 2019 - May 2023'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('2023');
    });

    it('returns empty string when no year detected', () => {
      const lines = ['Bachelor of Science in Computer Science'];
      const result = extractEducation(lines);
      expect(result[0].graduationYear).toBe('');
    });
  });

  describe('degree/institution splitting', () => {
    it('splits on dash delimiter', () => {
      const lines = ['Bachelor of Science - MIT 2020'];
      const result = extractEducation(lines);
      expect(result[0].degree).toContain('Bachelor');
      expect(result[0].institution).toContain('MIT');
    });

    it('splits on comma delimiter', () => {
      const lines = ['Bachelor of Science, Stanford University 2020'];
      const result = extractEducation(lines);
      expect(result[0].degree).toContain('Bachelor');
      expect(result[0].institution).toContain('Stanford');
    });

    it('splits on pipe delimiter', () => {
      const lines = ['B.S. Computer Science | Georgia Tech 2019'];
      const result = extractEducation(lines);
      expect(result[0].degree).toContain('B.S.');
      expect(result[0].institution).toContain('Georgia Tech');
    });

    it('splits on "at" keyword', () => {
      const lines = ['Bachelor of Science at University of Michigan 2021'];
      const result = extractEducation(lines);
      expect(result[0].degree).toContain('Bachelor');
      expect(result[0].institution).toContain('University of Michigan');
    });

    it('splits on "from" keyword', () => {
      const lines = ['M.S. in Computer Science from Stanford 2022'];
      const result = extractEducation(lines);
      expect(result[0].degree).toContain('M.S.');
      expect(result[0].institution).toContain('Stanford');
    });
  });

  describe('missing fields handling', () => {
    it('uses empty string for institution when not identifiable', () => {
      const lines = ['Bachelor of Science 2020'];
      const result = extractEducation(lines);
      expect(result[0].institution).toBe('');
      expect(result[0].degree).not.toBe('');
    });

    it('uses null for fieldOfStudy when not detected', () => {
      const lines = ['Bachelor - MIT 2020'];
      const result = extractEducation(lines);
      expect(result[0].fieldOfStudy).toBeNull();
    });

    it('never returns undefined for any field', () => {
      const lines = ['2020'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
      expect(result[0].degree).toBeDefined();
      expect(result[0].institution).toBeDefined();
      expect(result[0].graduationYear).toBeDefined();
      // fieldOfStudy can be null but not undefined
      expect(result[0].fieldOfStudy === undefined).toBe(false);
    });
  });

  describe('entry capping', () => {
    it('caps at 20 entries', () => {
      const lines = Array.from({ length: 30 }, (_, i) =>
        `Bachelor of Science - University ${i} ${2000 + i}`
      );
      const result = extractEducation(lines);
      expect(result).toHaveLength(20);
    });
  });

  describe('line skipping', () => {
    it('skips empty lines', () => {
      const lines = ['', '  ', 'Bachelor of Science - MIT 2020', ''];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
    });

    it('skips lines without degree keywords or date patterns', () => {
      const lines = [
        'This is just a regular text line',
        'GPA: 3.8/4.0',
        'Bachelor of Science - MIT 2020',
        'Relevant coursework: Algorithms, Data Structures',
      ];
      const result = extractEducation(lines);
      expect(result).toHaveLength(1);
    });

    it('returns empty array for no relevant lines', () => {
      const lines = ['Some random text', 'Another line with no education info'];
      const result = extractEducation(lines);
      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      const result = extractEducation([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('field of study extraction', () => {
    it('extracts field from "in Computer Science"', () => {
      const lines = ['Bachelor of Science in Computer Science - MIT 2020'];
      const result = extractEducation(lines);
      expect(result[0].fieldOfStudy).toBe('Computer Science');
    });

    it('extracts field from "of Engineering"', () => {
      const lines = ['Bachelor of Engineering - MIT 2020'];
      const result = extractEducation(lines);
      expect(result[0].fieldOfStudy).toBe('Engineering');
    });
  });

  describe('multiple entries', () => {
    it('extracts multiple education entries from multiple lines', () => {
      const lines = [
        'Ph.D. in Physics - Harvard University 2021',
        'M.S. in Computer Science, Stanford University 2017',
        'B.S. in Mathematics - MIT 2015',
      ];
      const result = extractEducation(lines);
      expect(result).toHaveLength(3);
      expect(result[0].degree).toContain('Ph.D.');
      expect(result[1].degree).toContain('M.S.');
      expect(result[2].degree).toContain('B.S.');
    });
  });
});
