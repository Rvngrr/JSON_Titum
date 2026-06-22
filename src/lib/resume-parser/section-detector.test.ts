import { describe, it, expect } from 'vitest';
import { detectSections, getSectionContent } from './section-detector';
import type { SectionType } from './section-detector';

describe('Section Detector', () => {
  describe('detectSections', () => {
    it('should return unstructured section for empty text', () => {
      const result = detectSections('');
      expect(result.hasStructure).toBe(false);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe('unstructured');
    });

    it('should return unstructured section for text with no headers', () => {
      const text = 'John Doe\njohn@email.com\nSome random text about my career.\nI have worked in many places.';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(false);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe('unstructured');
      expect(result.sections[0].lines).toHaveLength(4);
    });

    it('should detect Priority 1: UPPERCASE + underline headers', () => {
      const text = 'John Doe\njohn@email.com\n\nEXPERIENCE\n----------\nSoftware Engineer at Google\n2020 - Present';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const expSection = result.sections.find(s => s.type === 'experience');
      expect(expSection).toBeDefined();
      expect(expSection!.confidence).toBe(1);
    });

    it('should detect Priority 2: UPPERCASE standalone headers', () => {
      const text = 'John Doe\njohn@email.com\n\nEXPERIENCE\nSoftware Engineer at Google\n2020 - Present';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const expSection = result.sections.find(s => s.type === 'experience');
      expect(expSection).toBeDefined();
      expect(expSection!.confidence).toBe(2);
    });

    it('should detect Priority 3: Title-case + blank line headers', () => {
      const text = 'John Doe\njohn@email.com\n\nWork Experience\nSoftware Engineer at Google\n2020 - Present';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const expSection = result.sections.find(s => s.type === 'experience');
      expect(expSection).toBeDefined();
      expect(expSection!.confidence).toBe(3);
    });

    it('should detect Priority 4: Title-case + colon headers', () => {
      const text = 'John Doe\njohn@email.com\nSkills:\nJavaScript, TypeScript, React';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const skillsSection = result.sections.find(s => s.type === 'skills');
      expect(skillsSection).toBeDefined();
      expect(skillsSection!.confidence).toBe(4);
    });

    it('should detect Priority 5: Inline keyword headers', () => {
      const text = 'John Doe\njohn@email.com\nMy skills\nJavaScript, TypeScript, React';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const skillsSection = result.sections.find(s => s.type === 'skills');
      expect(skillsSection).toBeDefined();
      expect(skillsSection!.confidence).toBe(5);
    });

    it('should assign pre-header text to header-contact section', () => {
      const text = 'John Doe\njohn@email.com\n555-1234\n\nEXPERIENCE\nSoftware Engineer\n2020 - Present';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      const contactSection = result.sections.find(s => s.type === 'header-contact');
      expect(contactSection).toBeDefined();
      expect(contactSection!.startLine).toBe(0);
      expect(contactSection!.lines).toContain('John Doe');
      expect(contactSection!.lines).toContain('john@email.com');
    });

    it('should detect multiple section types', () => {
      const text = [
        'John Doe',
        'john@email.com',
        '',
        'EXPERIENCE',
        'Software Engineer at Google',
        '2020 - Present',
        '',
        'EDUCATION',
        'B.S. Computer Science',
        'MIT, 2020',
        '',
        'SKILLS',
        'JavaScript, TypeScript, React',
      ].join('\n');

      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);

      const types = result.sections.map(s => s.type);
      expect(types).toContain('header-contact');
      expect(types).toContain('experience');
      expect(types).toContain('education');
      expect(types).toContain('skills');
    });

    it('should handle keyword aliases for experience section', () => {
      const text = 'EMPLOYMENT\nSoftware Engineer\n2020 - Present';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('experience');
    });

    it('should handle keyword aliases for education section', () => {
      const text = 'ACADEMIC BACKGROUND\nB.S. Computer Science\nMIT, 2020';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('education');
    });

    it('should handle keyword aliases for certifications section', () => {
      const text = 'CERTIFICATES\nAWS Solutions Architect\nGoogle Cloud Professional';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('certifications');
    });

    it('should handle keyword aliases for projects section', () => {
      const text = 'PORTFOLIO\nProject A - Web App\nProject B - Mobile App';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('projects');
    });

    it('should handle keyword aliases for achievements section', () => {
      const text = 'AWARDS\nBest Employee 2023\nInnovation Award';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('achievements');
    });

    it('should resolve conflicts by keeping highest priority when same section type detected multiple times', () => {
      // Both "EXPERIENCE" (P2) and "Work Experience" (P3) map to the same type
      const text = [
        'John Doe',
        '',
        'EXPERIENCE',
        '----------',
        'Engineer at Corp A',
        '',
        'Work Experience',
        'Engineer at Corp B',
      ].join('\n');

      const result = detectSections(text);
      const expSections = result.sections.filter(s => s.type === 'experience');
      // Should only have one experience section (the P1 match)
      expect(expSections).toHaveLength(1);
      expect(expSections[0].confidence).toBe(1);
    });

    it('should ensure sections cover all lines with no gaps', () => {
      const text = [
        'John Doe',
        'john@email.com',
        '',
        'EXPERIENCE',
        'Software Engineer at Google',
        '2020 - Present',
        '',
        'EDUCATION',
        'B.S. Computer Science',
        'MIT, 2020',
      ].join('\n');

      const result = detectSections(text);
      const lines = text.split('\n');

      // Verify coverage: every line index should be covered exactly once
      const coveredLines = new Set<number>();
      for (const section of result.sections) {
        for (let i = section.startLine; i <= section.endLine; i++) {
          expect(coveredLines.has(i)).toBe(false); // no overlap
          coveredLines.add(i);
        }
      }
      // All lines should be covered
      for (let i = 0; i < lines.length; i++) {
        expect(coveredLines.has(i)).toBe(true);
      }
    });

    it('should ensure sections are ordered by startLine', () => {
      const text = [
        'John Doe',
        '',
        'EXPERIENCE',
        'Engineer',
        '',
        'EDUCATION',
        'BS CS',
        '',
        'SKILLS',
        'JavaScript',
      ].join('\n');

      const result = detectSections(text);
      for (let i = 1; i < result.sections.length; i++) {
        expect(result.sections[i].startLine).toBeGreaterThan(result.sections[i - 1].startLine);
      }
    });

    it('should handle case-insensitive keyword matching', () => {
      const text = 'Technical Skills:\nJavaScript, TypeScript';
      const result = detectSections(text);
      expect(result.hasStructure).toBe(true);
      expect(result.sections[0].type).toBe('skills');
    });
  });

  describe('getSectionContent', () => {
    it('should return lines for a specific section type', () => {
      const text = [
        'John Doe',
        '',
        'SKILLS',
        'JavaScript, TypeScript, React',
        'Python, Go',
      ].join('\n');

      const result = detectSections(text);
      const skillsContent = getSectionContent(result, 'skills');
      expect(skillsContent).toContain('JavaScript, TypeScript, React');
      expect(skillsContent).toContain('Python, Go');
    });

    it('should return empty array when section type is not found', () => {
      const text = 'SKILLS\nJavaScript';
      const result = detectSections(text);
      const eduContent = getSectionContent(result, 'education');
      expect(eduContent).toEqual([]);
    });

    it('should return header-contact content', () => {
      const text = [
        'John Doe',
        'john@email.com',
        '',
        'EXPERIENCE',
        'Engineer at Corp',
      ].join('\n');

      const result = detectSections(text);
      const contactContent = getSectionContent(result, 'header-contact');
      expect(contactContent).toContain('John Doe');
      expect(contactContent).toContain('john@email.com');
    });
  });
});
