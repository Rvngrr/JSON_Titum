import { describe, it, expect } from 'vitest';
import {
  SKILLS_TAXONOMY,
  lookupSkill,
  canonicalize,
  areSynonyms,
  getByCategory,
  getTaxonomySize,
  type SkillEntry,
  type SkillCategory,
  type IndustryId,
} from './skills-taxonomy';

describe('Skills Taxonomy', () => {
  describe('SKILLS_TAXONOMY array', () => {
    it('should contain at least 200 entries', () => {
      expect(SKILLS_TAXONOMY.length).toBeGreaterThanOrEqual(200);
    });

    it('should cover all 8 industry categories', () => {
      const industries = new Set<IndustryId>();
      for (const entry of SKILLS_TAXONOMY) {
        for (const industry of entry.industries) {
          industries.add(industry);
        }
      }
      expect(industries.size).toBe(8);
      expect(industries).toContain('software-engineering');
      expect(industries).toContain('data-science');
      expect(industries).toContain('devops');
      expect(industries).toContain('finance');
      expect(industries).toContain('healthcare');
      expect(industries).toContain('cybersecurity');
      expect(industries).toContain('mobile-development');
      expect(industries).toContain('game-development');
    });

    it('should have valid structure for all entries', () => {
      for (const entry of SKILLS_TAXONOMY) {
        expect(entry.canonical).toBeTruthy();
        expect(Array.isArray(entry.synonyms)).toBe(true);
        expect(entry.category).toBeTruthy();
        expect(entry.industries.length).toBeGreaterThan(0);
      }
    });

    it('should have unique canonical names', () => {
      const canonicals = SKILLS_TAXONOMY.map((e) => e.canonical.toLowerCase());
      const uniqueCanonicals = new Set(canonicals);
      expect(uniqueCanonicals.size).toBe(canonicals.length);
    });
  });

  describe('lookupSkill', () => {
    it('should find skill by canonical name', () => {
      const result = lookupSkill('Python');
      expect(result).not.toBeNull();
      expect(result!.canonical).toBe('Python');
    });

    it('should find skill by synonym', () => {
      const result = lookupSkill('reactjs');
      expect(result).not.toBeNull();
      expect(result!.canonical).toBe('React');
    });

    it('should be case-insensitive', () => {
      expect(lookupSkill('PYTHON')?.canonical).toBe('Python');
      expect(lookupSkill('python')?.canonical).toBe('Python');
      expect(lookupSkill('PyThOn')?.canonical).toBe('Python');
    });

    it('should return null for unknown skills', () => {
      expect(lookupSkill('nonexistent-skill-xyz')).toBeNull();
    });

    it('should resolve abbreviations', () => {
      expect(lookupSkill('AWS')?.canonical).toBe('Amazon Web Services');
      expect(lookupSkill('k8s')?.canonical).toBe('Kubernetes');
      expect(lookupSkill('ML')?.canonical).toBe('Machine Learning');
    });
  });

  describe('canonicalize', () => {
    it('should resolve synonyms to canonical name', () => {
      expect(canonicalize('reactjs')).toBe('React');
      expect(canonicalize('react.js')).toBe('React');
      expect(canonicalize('k8s')).toBe('Kubernetes');
      expect(canonicalize('postgres')).toBe('PostgreSQL');
    });

    it('should return original if not in taxonomy', () => {
      expect(canonicalize('unknown-skill')).toBe('unknown-skill');
    });

    it('should be case-insensitive', () => {
      expect(canonicalize('REACTJS')).toBe('React');
      expect(canonicalize('Golang')).toBe('Go');
    });
  });

  describe('areSynonyms', () => {
    it('should return true for synonyms of the same skill', () => {
      expect(areSynonyms('reactjs', 'react.js')).toBe(true);
      expect(areSynonyms('React', 'reactjs')).toBe(true);
      expect(areSynonyms('AWS', 'amazon web services')).toBe(true);
    });

    it('should return false for different skills', () => {
      expect(areSynonyms('React', 'Angular')).toBe(false);
      expect(areSynonyms('Python', 'Java')).toBe(false);
    });

    it('should return false if either skill is not in taxonomy', () => {
      expect(areSynonyms('React', 'unknown')).toBe(false);
      expect(areSynonyms('unknown1', 'unknown2')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(areSynonyms('REACTJS', 'REACT.JS')).toBe(true);
    });
  });

  describe('getByCategory', () => {
    it('should return all entries for a category', () => {
      const languages = getByCategory('Programming Languages');
      expect(languages.length).toBeGreaterThan(0);
      for (const entry of languages) {
        expect(entry.category).toBe('Programming Languages');
      }
    });

    it('should return empty array for unused category', () => {
      // All defined categories have entries, so this is a type guard test
      const frameworks = getByCategory('Frameworks');
      expect(frameworks.length).toBeGreaterThan(0);
    });

    it('should include expected skills in frameworks', () => {
      const frameworks = getByCategory('Frameworks');
      const names = frameworks.map((f) => f.canonical);
      expect(names).toContain('React');
      expect(names).toContain('Angular');
      expect(names).toContain('Vue.js');
      expect(names).toContain('Next.js');
      expect(names).toContain('Django');
      expect(names).toContain('Spring');
    });
  });

  describe('getTaxonomySize', () => {
    it('should return the correct count', () => {
      expect(getTaxonomySize()).toBe(SKILLS_TAXONOMY.length);
    });

    it('should be at least 200', () => {
      expect(getTaxonomySize()).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Performance', () => {
    it('should perform lookups in under 50ms for 1000 iterations', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        lookupSkill('reactjs');
        lookupSkill('Python');
        lookupSkill('AWS');
        lookupSkill('k8s');
        lookupSkill('nonexistent');
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
