/**
 * Tests for Skill ROI Analyzer
 *
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { describe, it, expect } from 'vitest';
import { analyzeSkillROI } from './skill-roi-analyzer';

describe('analyzeSkillROI', () => {
  const jobRequiredSkills = [
    { skill_name: 'React', importance: 'required' as const },
    { skill_name: 'TypeScript', importance: 'required' as const },
    { skill_name: 'Node.js', importance: 'required' as const },
    { skill_name: 'PostgreSQL', importance: 'preferred' as const },
    { skill_name: 'Docker', importance: 'preferred' as const },
  ];

  it('should return results sorted by scoreDelta descending', async () => {
    const applicantSkills = ['React'];
    const missingSkills = ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    // Verify sorted descending by delta
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].scoreDelta).toBeGreaterThanOrEqual(results[i].scoreDelta);
    }
  });

  it('should give higher delta to required skills than preferred skills', async () => {
    const applicantSkills = ['React'];
    const missingSkills = ['TypeScript', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    const typescriptResult = results.find(r => r.skillName === 'TypeScript')!;
    const dockerResult = results.find(r => r.skillName === 'Docker')!;

    // TypeScript is 'required' (weight 2), Docker is 'preferred' (weight 1)
    // So TypeScript should have a higher score delta
    expect(typescriptResult.scoreDelta).toBeGreaterThan(dockerResult.scoreDelta);
  });

  it('should return the correct currentScore for all results', async () => {
    const applicantSkills = ['React', 'TypeScript'];
    const missingSkills = ['Node.js', 'PostgreSQL', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    // All results should have the same current score
    // React (2pts) + TypeScript (2pts) = 4 earned out of 2+2+2+1+1 = 8 total
    // currentScore = (4/8) * 100 = 50
    for (const result of results) {
      expect(result.currentScore).toBe(50);
    }
  });

  it('should correctly calculate projectedScore when adding a required skill', async () => {
    const applicantSkills = ['React', 'TypeScript'];
    const missingSkills = ['Node.js'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    // After adding Node.js (required, weight 2): 4 + 2 = 6 earned out of 8 total
    // projectedScore = (6/8) * 100 = 75
    expect(results[0].skillName).toBe('Node.js');
    expect(results[0].projectedScore).toBe(75);
    expect(results[0].scoreDelta).toBe(25);
  });

  it('should correctly calculate projectedScore when adding a preferred skill', async () => {
    const applicantSkills = ['React', 'TypeScript'];
    const missingSkills = ['Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    // After adding Docker (preferred, weight 1): 4 + 1 = 5 earned out of 8 total
    // projectedScore = (5/8) * 100 = 63 (rounded)
    expect(results[0].skillName).toBe('Docker');
    expect(results[0].projectedScore).toBe(63);
    expect(results[0].scoreDelta).toBe(13);
  });

  it('should return at most topN results (default: 5)', async () => {
    const applicantSkills: string[] = [];
    const missingSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL', 'Redis'];
    const extendedJobSkills = [
      ...jobRequiredSkills,
      { skill_name: 'GraphQL', importance: 'preferred' as const },
      { skill_name: 'Redis', importance: 'preferred' as const },
    ];

    const results = await analyzeSkillROI(applicantSkills, extendedJobSkills, missingSkills);

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should respect custom topN parameter', async () => {
    const applicantSkills: string[] = [];
    const missingSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills, 3);

    expect(results.length).toBe(3);
  });

  it('should return fewer results when missing skills count is less than topN', async () => {
    const applicantSkills = ['React', 'TypeScript', 'Node.js'];
    const missingSkills = ['PostgreSQL', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    expect(results.length).toBe(2);
  });

  it('should return empty array when there are no missing skills', async () => {
    const applicantSkills = ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];
    const missingSkills: string[] = [];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    expect(results).toEqual([]);
  });

  it('should handle empty job required skills', async () => {
    const applicantSkills = ['React'];
    const missingSkills = ['TypeScript'];

    const results = await analyzeSkillROI(applicantSkills, [], missingSkills);

    // With no job skills, both scores are 0, delta is 0
    expect(results[0].currentScore).toBe(0);
    expect(results[0].projectedScore).toBe(0);
    expect(results[0].scoreDelta).toBe(0);
  });

  it('should have non-negative scoreDelta for all results', async () => {
    const applicantSkills = ['React'];
    const missingSkills = ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];

    const results = await analyzeSkillROI(applicantSkills, jobRequiredSkills, missingSkills);

    for (const result of results) {
      expect(result.scoreDelta).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle skill name normalization (e.g., Node.js vs NodeJS)', async () => {
    const applicantSkills = ['React'];
    const jobSkills = [
      { skill_name: 'React', importance: 'required' as const },
      { skill_name: 'Node.js', importance: 'required' as const },
    ];
    const missingSkills = ['NodeJS']; // Should match Node.js after normalization

    const results = await analyzeSkillROI(applicantSkills, jobSkills, missingSkills);

    // Adding 'NodeJS' should match 'Node.js' and improve the score
    expect(results[0].scoreDelta).toBeGreaterThan(0);
  });

  it('should complete within 3 seconds for 15 missing skills', async () => {
    const applicantSkills = ['React'];
    const manyJobSkills = Array.from({ length: 16 }, (_, i) => ({
      skill_name: `Skill${i}`,
      importance: (i % 2 === 0 ? 'required' : 'preferred') as 'required' | 'preferred',
    }));
    // First skill is matched (React -> Skill0 won't match, so let's adjust)
    manyJobSkills[0] = { skill_name: 'React', importance: 'required' };
    const missingSkills = Array.from({ length: 15 }, (_, i) => `Skill${i + 1}`);

    const start = performance.now();
    const results = await analyzeSkillROI(applicantSkills, manyJobSkills, missingSkills);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(3000);
    expect(results.length).toBe(5); // default topN
  });
});
