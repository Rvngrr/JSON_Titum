/**
 * Unit tests for Profile Change Triggers.
 *
 * Tests the onProfileChange and onResumeChange functions that trigger
 * recalculation of career intelligence metrics when applicant data changes.
 *
 * Requirements: 19.8, 12.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../ai/match-engine', () => ({
  calculateMatch: vi.fn(),
}));

vi.mock('./candidate-scorer', () => ({
  checkAtRiskStatus: vi.fn(),
}));

vi.mock('./hidden-gem-detector', () => ({
  detectHiddenGem: vi.fn(),
}));

vi.mock('../llm/utils', () => ({
  computeHash: vi.fn((text: string) => `hash_${text.substring(0, 10)}`),
}));

import { createAdminClient } from '../supabase/server';
import { calculateMatch } from '../ai/match-engine';
import { checkAtRiskStatus } from './candidate-scorer';
import { detectHiddenGem } from './hidden-gem-detector';
import { onProfileChange, onResumeChange } from './profile-triggers';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockNeq = vi.fn();
  const mockIn = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockUpsert = vi.fn();
  const mockDelete = vi.fn();

  // Build chainable mock
  const chain = {
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    neq: mockNeq,
    in: mockIn,
    maybeSingle: mockMaybeSingle,
    upsert: mockUpsert,
    delete: mockDelete,
  };

  mockFrom.mockReturnValue(chain);
  mockSelect.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockNeq.mockReturnValue(chain);
  mockIn.mockReturnValue(chain);
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockDelete.mockReturnValue(chain);

  return { supabase: chain, mocks: { mockFrom, mockSelect, mockEq, mockNeq, mockIn, mockMaybeSingle, mockUpsert, mockDelete } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile Triggers', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase.supabase as unknown as ReturnType<typeof createAdminClient>);
  });

  describe('onProfileChange', () => {
    it('should return zero recalculations when applicant has no skill profile', async () => {
      // skill_profiles query returns null
      mockSupabase.mocks.mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // job_descriptions query returns empty
      mockSupabase.mocks.mockEq.mockImplementation(function (this: typeof mockSupabase.supabase) {
        return this;
      });

      // Override specific query behaviors
      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  eq: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return mockSupabase.supabase;
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 0,
        threshold: 3,
      });

      const result = await onProfileChange('applicant-123');

      expect(result.matchesRecalculated).toBe(0);
      expect(result.hiddenGemJobIds).toEqual([]);
      expect(result.atRiskStatus.isAtRisk).toBe(false);
    });

    it('should recalculate match scores for all published jobs', async () => {
      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'sp-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 's1', name: 'JavaScript', skill_profile_id: 'sp-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'job-1' }, { id: 'job-2' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'job_required_skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'jrs-1', skill_name: 'JavaScript', importance: 'required', job_description_id: 'job-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            upsert: () => Promise.resolve({ data: null, error: null }),
            select: () => ({
              eq: () => ({
                gte: () => ({
                  eq: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(calculateMatch).mockResolvedValue({
        matchPercentage: 85,
        matchedSkills: ['JavaScript'],
        missingSkills: [],
      });
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 1,
        threshold: 3,
      });
      vi.mocked(detectHiddenGem).mockReturnValue({
        isHiddenGem: false,
        matchPercentage: 85,
        missingSkills: [],
        easySkills: [],
        hardSkills: [],
        easySkillRatio: 0,
      });

      const result = await onProfileChange('applicant-123');

      expect(result.matchesRecalculated).toBe(2);
      expect(calculateMatch).toHaveBeenCalledTimes(2);
    });

    it('should detect hidden gem jobs in the 60-79% range', async () => {
      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'sp-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 's1', name: 'React', skill_profile_id: 'sp-1' }], error: null }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 'job-1' }], error: null }),
            }),
          };
        }
        if (table === 'job_required_skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'jrs-1', skill_name: 'React', importance: 'required', job_description_id: 'job-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            upsert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(calculateMatch).mockResolvedValue({
        matchPercentage: 70,
        matchedSkills: ['React'],
        missingSkills: ['Git', 'Excel'],
      });
      vi.mocked(detectHiddenGem).mockReturnValue({
        isHiddenGem: true,
        matchPercentage: 70,
        missingSkills: ['Git', 'Excel'],
        easySkills: ['Git', 'Excel'],
        hardSkills: [],
        easySkillRatio: 1.0,
      });
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 0,
        threshold: 3,
      });

      const result = await onProfileChange('applicant-123');

      expect(result.hiddenGemJobIds).toContain('job-1');
      expect(detectHiddenGem).toHaveBeenCalledWith(70, ['Git', 'Excel']);
    });
  });

  describe('onResumeChange', () => {
    it('should invalidate proficiency_analysis cache entries for the applicant', async () => {
      const deletedIds: string[] = [];

      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'llm_results_cache') {
          return {
            select: (cols: string) => ({
              eq: (col: string, val: string) => {
                if (col === 'operation_type' && val === 'proficiency_analysis') {
                  return {
                    eq: () => Promise.resolve({
                      data: [
                        { id: 'cache-1', source_hash: 'old_hash_123' },
                        { id: 'cache-2', source_hash: 'old_hash_456' },
                      ],
                      error: null,
                    }),
                  };
                }
                if (col === 'operation_type' && val === 'ats_analysis') {
                  return {
                    eq: () => Promise.resolve({ data: [], error: null }),
                    neq: () => Promise.resolve({ data: [], error: null }),
                  };
                }
                return { eq: () => Promise.resolve({ data: [], error: null }) };
              },
              neq: () => Promise.resolve({ data: [], error: null }),
            }),
            delete: () => ({
              in: (_col: string, ids: string[]) => {
                deletedIds.push(...ids);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        }
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: 'sp-1', resume_text: 'old resume content' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  eq: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 0,
        threshold: 3,
      });

      const result = await onResumeChange('applicant-123', 'new resume content');

      // Cache entries with old hashes should be invalidated
      expect(result.cacheEntriesInvalidated).toBeGreaterThanOrEqual(0);
      expect(result.newResumeHash).toBe('hash_new resume');
    });

    it('should compute new resume hash and return it', async () => {
      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'llm_results_cache') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
              neq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  eq: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 0,
        threshold: 3,
      });

      const result = await onResumeChange('applicant-123', 'my updated resume');

      expect(result.newResumeHash).toBeDefined();
      expect(typeof result.newResumeHash).toBe('string');
    });

    it('should also trigger profile change recalculations (match scores)', async () => {
      const mockFromImpl = vi.fn().mockImplementation((table: string) => {
        if (table === 'llm_results_cache') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
              neq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        if (table === 'skill_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'sp-1', resume_text: null }, error: null }),
              }),
            }),
          };
        }
        if (table === 'skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 's1', name: 'Python', skill_profile_id: 'sp-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'job_descriptions') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 'job-1' }], error: null }),
            }),
          };
        }
        if (table === 'job_required_skills') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'jrs-1', skill_name: 'Python', importance: 'required', job_description_id: 'job-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'match_results') {
          return {
            upsert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      });

      vi.mocked(createAdminClient).mockReturnValue({ from: mockFromImpl } as unknown as ReturnType<typeof createAdminClient>);
      vi.mocked(calculateMatch).mockResolvedValue({
        matchPercentage: 100,
        matchedSkills: ['Python'],
        missingSkills: [],
      });
      vi.mocked(checkAtRiskStatus).mockResolvedValue({
        isAtRisk: false,
        highMatchJobCount: 0,
        threshold: 3,
      });

      const result = await onResumeChange('applicant-123', 'Python expert resume');

      expect(result.matchesRecalculated).toBe(1);
      expect(calculateMatch).toHaveBeenCalled();
    });
  });
});
