/**
 * Unit tests for Skills Extractor
 *
 * Tests skill extraction from multiple formats, proficiency assignment,
 * proficiency promotion, canonicalization, and certification parsing.
 */

import { describe, it, expect } from 'vitest';
import { extractSkills, extractCertifications } from './skills-extractor';
import type { SkillsExtractionInput } from './skills-extractor';

describe('extractSkills', () => {
  const emptyInput: SkillsExtractionInput = {
    skillsLines: [],
    certificationLines: [],
    experienceLines: [],
    projectLines: [],
  };

  describe('parsing formats', () => {
    it('parses comma-separated skill lists', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['JavaScript, TypeScript, React, Python'],
      };
      const result = extractSkills(input);
      expect(result.length).toBe(4);
      expect(result.map(s => s.name)).toContain('JavaScript');
      expect(result.map(s => s.name)).toContain('TypeScript');
      expect(result.map(s => s.name)).toContain('React');
      expect(result.map(s => s.name)).toContain('Python');
    });

    it('parses pipe-separated skill lists', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['JavaScript | TypeScript | React'],
      };
      const result = extractSkills(input);
      expect(result.length).toBe(3);
      expect(result.map(s => s.name)).toContain('JavaScript');
      expect(result.map(s => s.name)).toContain('TypeScript');
      expect(result.map(s => s.name)).toContain('React');
    });

    it('parses bullet-point lists', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: [
          '• Python',
          '- TypeScript',
          '* Docker',
        ],
      };
      const result = extractSkills(input);
      expect(result.length).toBe(3);
      expect(result.map(s => s.name)).toContain('Python');
      expect(result.map(s => s.name)).toContain('TypeScript');
      expect(result.map(s => s.name)).toContain('Docker');
    });

    it('parses categorized skill lists (label: items)', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: [
          'Languages: Python, Java, Go',
          'Frameworks: React, Django',
        ],
      };
      const result = extractSkills(input);
      expect(result.length).toBe(5);
      expect(result.map(s => s.name)).toContain('Python');
      expect(result.map(s => s.name)).toContain('Java');
      expect(result.map(s => s.name)).toContain('Go');
      expect(result.map(s => s.name)).toContain('React');
      expect(result.map(s => s.name)).toContain('Django');
    });

    it('returns empty array for empty input', () => {
      const result = extractSkills(emptyInput);
      expect(result).toEqual([]);
    });
  });

  describe('proficiency assignment', () => {
    it('assigns intermediate to skills in the skills section', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['Python, React'],
      };
      const result = extractSkills(input);
      expect(result.every(s => s.proficiencyLevel === 'intermediate')).toBe(true);
    });

    it('assigns advanced when skill appears in experience with quantified achievement', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        experienceLines: [
          'Built a React dashboard that improved user engagement by 40%',
        ],
      };
      const result = extractSkills(input);
      const reactSkill = result.find(s => s.name === 'React');
      expect(reactSkill).toBeDefined();
      expect(reactSkill!.proficiencyLevel).toBe('advanced');
    });

    it('assigns beginner to skills found only in certification lines', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        certificationLines: ['AWS Certified Solutions Architect'],
      };
      const result = extractSkills(input);
      const awsSkill = result.find(s => s.name === 'Amazon Web Services');
      expect(awsSkill).toBeDefined();
      expect(awsSkill!.proficiencyLevel).toBe('beginner');
    });
  });

  describe('proficiency promotion', () => {
    it('promotes skill to highest proficiency when found in multiple sections', () => {
      const input: SkillsExtractionInput = {
        skillsLines: ['Python'],
        certificationLines: ['Python Developer Certificate'],
        experienceLines: ['Used Python to reduce processing time by 50%'],
        projectLines: [],
      };
      const result = extractSkills(input);
      const pythonSkill = result.find(s => s.name === 'Python');
      expect(pythonSkill).toBeDefined();
      expect(pythonSkill!.proficiencyLevel).toBe('advanced');
    });

    it('keeps intermediate when skill is in skills and certifications but not advanced-worthy experience', () => {
      const input: SkillsExtractionInput = {
        skillsLines: ['Docker'],
        certificationLines: ['Docker Fundamentals'],
        experienceLines: [],
        projectLines: [],
      };
      const result = extractSkills(input);
      const dockerSkill = result.find(s => s.name === 'Docker');
      expect(dockerSkill).toBeDefined();
      expect(dockerSkill!.proficiencyLevel).toBe('intermediate');
    });
  });

  describe('canonicalization', () => {
    it('canonicalizes synonyms to primary form', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['reactjs, k8s, js'],
      };
      const result = extractSkills(input);
      expect(result.map(s => s.name)).toContain('React');
      expect(result.map(s => s.name)).toContain('Kubernetes');
      expect(result.map(s => s.name)).toContain('JavaScript');
    });

    it('preserves rawName when canonicalizing', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['reactjs'],
      };
      const result = extractSkills(input);
      expect(result[0].name).toBe('React');
      expect(result[0].rawName).toBe('reactjs');
    });

    it('keeps original name if not in taxonomy', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['SomeObscureFramework'],
      };
      const result = extractSkills(input);
      expect(result[0].name).toBe('SomeObscureFramework');
      expect(result[0].rawName).toBe('SomeObscureFramework');
    });
  });

  describe('caps', () => {
    it('caps at 100 skills', () => {
      const manySkills = Array.from({ length: 150 }, (_, i) => `Skill${i}`).join(', ');
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: [manySkills],
      };
      const result = extractSkills(input);
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('deduplication', () => {
    it('deduplicates skills by canonical name', () => {
      const input: SkillsExtractionInput = {
        ...emptyInput,
        skillsLines: ['React, reactjs, React.js'],
      };
      const result = extractSkills(input);
      const reactEntries = result.filter(s => s.name === 'React');
      expect(reactEntries.length).toBe(1);
    });
  });
});

describe('extractCertifications', () => {
  it('extracts certification names from bullet lists', () => {
    const lines = [
      '• AWS Certified Solutions Architect',
      '- Google Cloud Professional Data Engineer',
      '* Certified Kubernetes Administrator',
    ];
    const result = extractCertifications(lines);
    expect(result.length).toBe(3);
    expect(result[0].name).toContain('AWS Certified Solutions Architect');
    expect(result[1].name).toContain('Google Cloud Professional Data Engineer');
    expect(result[2].name).toContain('Certified Kubernetes Administrator');
  });

  it('extracts issuer after " by " delimiter', () => {
    const lines = ['AWS Solutions Architect by Amazon'];
    const result = extractCertifications(lines);
    expect(result[0].name).toBe('AWS Solutions Architect');
    expect(result[0].issuer).toBe('Amazon');
  });

  it('extracts issuer after " from " delimiter', () => {
    const lines = ['Certified Scrum Master from Scrum Alliance'];
    const result = extractCertifications(lines);
    expect(result[0].name).toBe('Certified Scrum Master');
    expect(result[0].issuer).toBe('Scrum Alliance');
  });

  it('extracts issuer after " - " delimiter', () => {
    const lines = ['CKAD - Linux Foundation'];
    const result = extractCertifications(lines);
    expect(result[0].name).toBe('CKAD');
    expect(result[0].issuer).toBe('Linux Foundation');
  });

  it('extracts year from end of line', () => {
    const lines = ['AWS Solutions Architect 2023'];
    const result = extractCertifications(lines);
    expect(result[0].name).toBe('AWS Solutions Architect');
    expect(result[0].date).toBe('2023');
  });

  it('extracts year in parentheses', () => {
    const lines = ['Google Cloud Engineer (2022)'];
    const result = extractCertifications(lines);
    expect(result[0].date).toBe('2022');
  });

  it('returns empty strings when no issuer or date found', () => {
    const lines = ['Some Random Certification'];
    const result = extractCertifications(lines);
    expect(result[0].name).toBe('Some Random Certification');
    expect(result[0].issuer).toBe('');
    expect(result[0].date).toBe('');
  });

  it('returns empty array for empty input', () => {
    const result = extractCertifications([]);
    expect(result).toEqual([]);
  });

  it('caps at 50 certifications', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `Certification Number ${i}`);
    const result = extractCertifications(lines);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('skips empty and short lines', () => {
    const lines = ['', '  ', 'ab', 'Valid Certification Name'];
    const result = extractCertifications(lines);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Valid Certification Name');
  });
});
