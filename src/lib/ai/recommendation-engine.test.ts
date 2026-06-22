import { describe, it, expect } from 'vitest';
import {
  validateRecommendation,
  sortByImpactDescending,
  generateFallbackRecommendation,
  parseRecommendationsFromAI,
  generateRecommendations,
  type RecommendationSuggestion,
  type RecommendationInput,
} from './recommendation-engine';
import type { Skill, JobRequiredSkill } from '@/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-1',
    skill_profile_id: 'sp-1',
    name: 'React',
    proficiency_level: 'intermediate',
    source: 'resume_parsed',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeJobRequiredSkill(overrides: Partial<JobRequiredSkill> = {}): JobRequiredSkill {
  return {
    id: 'jrs-1',
    job_description_id: 'job-1',
    skill_name: 'TypeScript',
    importance: 'required',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    applicantSkills: [makeSkill()],
    jobRequiredSkills: [
      makeJobRequiredSkill({ skill_name: 'React', importance: 'required' }),
      makeJobRequiredSkill({ id: 'jrs-2', skill_name: 'TypeScript', importance: 'required' }),
      makeJobRequiredSkill({ id: 'jrs-3', skill_name: 'Docker', importance: 'preferred' }),
    ],
    matchResult: {
      match_percentage: 60,
      matched_skills: ['React'],
      missing_skills: ['TypeScript', 'Docker'],
    },
    ...overrides,
  };
}

// ============================================================================
// validateRecommendation
// ============================================================================

describe('validateRecommendation', () => {
  it('accepts a valid skill_to_add recommendation', () => {
    const result = validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: 'Learn Docker for containerization.',
      impact_score: 7,
    });

    expect(result).toEqual({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: 'Learn Docker for containerization.',
      impact_score: 7,
    });
  });

  it('accepts a valid skill_to_improve recommendation', () => {
    const result = validateRecommendation({
      suggestion_type: 'skill_to_improve',
      skill_name: 'React',
      description: 'Improve React to advanced level.',
      impact_score: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.suggestion_type).toBe('skill_to_improve');
  });

  it('rejects null input', () => {
    expect(validateRecommendation(null)).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(validateRecommendation('string')).toBeNull();
    expect(validateRecommendation(42)).toBeNull();
  });

  it('rejects invalid suggestion_type', () => {
    expect(validateRecommendation({
      suggestion_type: 'invalid',
      skill_name: 'Docker',
      description: 'desc',
      impact_score: 5,
    })).toBeNull();
  });

  it('rejects empty skill_name', () => {
    expect(validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: '  ',
      description: 'desc',
      impact_score: 5,
    })).toBeNull();
  });

  it('rejects empty description', () => {
    expect(validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: '',
      impact_score: 5,
    })).toBeNull();
  });

  it('rejects impact_score out of range (below 1)', () => {
    expect(validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: 'desc',
      impact_score: 0,
    })).toBeNull();
  });

  it('rejects impact_score out of range (above 10)', () => {
    expect(validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: 'desc',
      impact_score: 11,
    })).toBeNull();
  });

  it('rejects non-integer impact_score', () => {
    expect(validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: 'Docker',
      description: 'desc',
      impact_score: 5.5,
    })).toBeNull();
  });

  it('trims whitespace from skill_name and description', () => {
    const result = validateRecommendation({
      suggestion_type: 'skill_to_add',
      skill_name: '  Docker  ',
      description: '  Learn Docker.  ',
      impact_score: 7,
    });

    expect(result!.skill_name).toBe('Docker');
    expect(result!.description).toBe('Learn Docker.');
  });
});

// ============================================================================
// sortByImpactDescending
// ============================================================================

describe('sortByImpactDescending', () => {
  it('sorts recommendations by impact_score descending', () => {
    const input: RecommendationSuggestion[] = [
      { suggestion_type: 'skill_to_add', skill_name: 'A', description: 'a', impact_score: 3 },
      { suggestion_type: 'skill_to_add', skill_name: 'B', description: 'b', impact_score: 9 },
      { suggestion_type: 'skill_to_improve', skill_name: 'C', description: 'c', impact_score: 6 },
    ];

    const sorted = sortByImpactDescending(input);

    expect(sorted[0].impact_score).toBe(9);
    expect(sorted[1].impact_score).toBe(6);
    expect(sorted[2].impact_score).toBe(3);
  });

  it('does not mutate the original array', () => {
    const input: RecommendationSuggestion[] = [
      { suggestion_type: 'skill_to_add', skill_name: 'A', description: 'a', impact_score: 3 },
      { suggestion_type: 'skill_to_add', skill_name: 'B', description: 'b', impact_score: 9 },
    ];

    sortByImpactDescending(input);

    expect(input[0].impact_score).toBe(3);
  });

  it('handles empty array', () => {
    expect(sortByImpactDescending([])).toEqual([]);
  });

  it('handles single item', () => {
    const input: RecommendationSuggestion[] = [
      { suggestion_type: 'skill_to_add', skill_name: 'A', description: 'a', impact_score: 5 },
    ];

    expect(sortByImpactDescending(input)).toEqual(input);
  });
});

// ============================================================================
// generateFallbackRecommendation
// ============================================================================

describe('generateFallbackRecommendation', () => {
  it('returns skill_to_add for a missing required skill', () => {
    const input = makeInput();
    const fallback = generateFallbackRecommendation(input);

    expect(fallback.suggestion_type).toBe('skill_to_add');
    expect(fallback.skill_name).toBe('TypeScript');
    expect(fallback.impact_score).toBe(8);
  });

  it('returns skill_to_add for missing preferred skill when no required missing', () => {
    const input = makeInput({
      jobRequiredSkills: [
        makeJobRequiredSkill({ skill_name: 'Docker', importance: 'preferred' }),
      ],
      matchResult: {
        match_percentage: 80,
        matched_skills: [],
        missing_skills: ['Docker'],
      },
    });

    const fallback = generateFallbackRecommendation(input);

    expect(fallback.suggestion_type).toBe('skill_to_add');
    expect(fallback.skill_name).toBe('Docker');
    expect(fallback.impact_score).toBe(5);
  });

  it('returns skill_to_improve when no missing skills but match < 100', () => {
    const input = makeInput({
      applicantSkills: [makeSkill({ name: 'React', proficiency_level: 'beginner' })],
      matchResult: {
        match_percentage: 90,
        matched_skills: ['React'],
        missing_skills: [],
      },
    });

    const fallback = generateFallbackRecommendation(input);

    expect(fallback.suggestion_type).toBe('skill_to_improve');
    expect(fallback.skill_name).toBe('React');
  });

  it('returns generic fallback when all skills are at expert level', () => {
    const input = makeInput({
      applicantSkills: [makeSkill({ name: 'React', proficiency_level: 'expert' })],
      matchResult: {
        match_percentage: 95,
        matched_skills: ['React'],
        missing_skills: [],
      },
    });

    const fallback = generateFallbackRecommendation(input);

    expect(fallback.suggestion_type).toBe('skill_to_improve');
    expect(fallback.skill_name).toBe('General Skills');
  });
});

// ============================================================================
// parseRecommendationsFromAI
// ============================================================================

describe('parseRecommendationsFromAI', () => {
  it('parses valid JSON array of recommendations', () => {
    const json = JSON.stringify([
      { suggestion_type: 'skill_to_add', skill_name: 'Docker', description: 'Learn Docker.', impact_score: 8 },
      { suggestion_type: 'skill_to_improve', skill_name: 'React', description: 'Improve React.', impact_score: 5 },
    ]);

    const result = parseRecommendationsFromAI(json);

    expect(result).toHaveLength(2);
    expect(result[0].skill_name).toBe('Docker');
    expect(result[1].skill_name).toBe('React');
  });

  it('strips markdown code fences', () => {
    const json = '```json\n[{"suggestion_type":"skill_to_add","skill_name":"Go","description":"Learn Go.","impact_score":7}]\n```';

    const result = parseRecommendationsFromAI(json);

    expect(result).toHaveLength(1);
    expect(result[0].skill_name).toBe('Go');
  });

  it('filters out invalid items and keeps valid ones', () => {
    const json = JSON.stringify([
      { suggestion_type: 'skill_to_add', skill_name: 'Docker', description: 'Valid.', impact_score: 8 },
      { suggestion_type: 'invalid', skill_name: 'Bad', description: 'Invalid type.', impact_score: 5 },
      { suggestion_type: 'skill_to_add', skill_name: '', description: 'Empty name.', impact_score: 5 },
    ]);

    const result = parseRecommendationsFromAI(json);

    expect(result).toHaveLength(1);
    expect(result[0].skill_name).toBe('Docker');
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseRecommendationsFromAI('not json')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(parseRecommendationsFromAI('{"key": "value"}')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseRecommendationsFromAI('')).toEqual([]);
  });
});

// ============================================================================
// generateRecommendations (integration - edge cases only, no OpenAI call)
// ============================================================================

describe('generateRecommendations', () => {
  it('returns empty array when match_percentage is 100', async () => {
    const input = makeInput({
      matchResult: {
        match_percentage: 100,
        matched_skills: ['React', 'TypeScript', 'Docker'],
        missing_skills: [],
      },
    });

    const result = await generateRecommendations(input);

    expect(result).toEqual([]);
  });

  it('returns at least one recommendation when match < 100 and OpenAI fails', async () => {
    // Without OPENAI_API_KEY set, the call will fail and fallback logic triggers
    const input = makeInput();

    const result = await generateRecommendations(input);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].impact_score).toBeGreaterThanOrEqual(1);
    expect(result[0].impact_score).toBeLessThanOrEqual(10);
  });

  it('fallback recommendations are sorted by impact descending', async () => {
    const input = makeInput();

    const result = await generateRecommendations(input);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].impact_score).toBeGreaterThanOrEqual(result[i + 1].impact_score);
    }
  });
});
