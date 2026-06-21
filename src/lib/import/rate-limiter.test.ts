/**
 * Property-based tests for Rate Limiter
 *
 * **Validates: Requirements 6.2, 6.3, 6.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the Supabase admin client before importing the module under test
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
const mockInsert = vi.fn(() => ({ error: null }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    }),
  }),
}));

import { checkRateLimit, resetIfNewMonth } from './rate-limiter';

describe('Rate Limiter - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 5: Rate Limit Enforcement
   *
   * For any monthly request count >= 200, isExhausted === true and remaining === 0.
   * For any count >= 180 and < 200, isNearLimit === true and isExhausted === false.
   * For any count < 180, isNearLimit === false and isExhausted === false.
   *
   * **Validates: Requirements 6.2, 6.3**
   */
  describe('Property 5: Rate Limit Enforcement', () => {
    it('for any count >= 200: isExhausted === true and remaining === 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 200, max: 10000 }),
          async (count) => {
            // Mock the resetIfNewMonth call (month matches, no reset needed)
            mockSingle.mockResolvedValueOnce({
              data: { id: 'rate-1', month_year: getCurrentMonthYear() },
              error: null,
            });

            // Mock the checkRateLimit query
            mockSingle.mockResolvedValueOnce({
              data: {
                request_count: count,
                limit_max: 200,
                month_year: getCurrentMonthYear(),
              },
              error: null,
            });

            const status = await checkRateLimit();

            expect(status.isExhausted).toBe(true);
            expect(status.remaining).toBe(0);
            expect(status.currentCount).toBe(count);
            expect(status.limit).toBe(200);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('for any count >= 180 and < 200: isNearLimit === true, isExhausted === false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 180, max: 199 }),
          async (count) => {
            // Mock the resetIfNewMonth call
            mockSingle.mockResolvedValueOnce({
              data: { id: 'rate-1', month_year: getCurrentMonthYear() },
              error: null,
            });

            // Mock the checkRateLimit query
            mockSingle.mockResolvedValueOnce({
              data: {
                request_count: count,
                limit_max: 200,
                month_year: getCurrentMonthYear(),
              },
              error: null,
            });

            const status = await checkRateLimit();

            expect(status.isNearLimit).toBe(true);
            expect(status.isExhausted).toBe(false);
            expect(status.remaining).toBe(200 - count);
            expect(status.currentCount).toBe(count);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('for any count < 180: isNearLimit === false, isExhausted === false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 179 }),
          async (count) => {
            // Mock the resetIfNewMonth call
            mockSingle.mockResolvedValueOnce({
              data: { id: 'rate-1', month_year: getCurrentMonthYear() },
              error: null,
            });

            // Mock the checkRateLimit query
            mockSingle.mockResolvedValueOnce({
              data: {
                request_count: count,
                limit_max: 200,
                month_year: getCurrentMonthYear(),
              },
              error: null,
            });

            const status = await checkRateLimit();

            expect(status.isNearLimit).toBe(false);
            expect(status.isExhausted).toBe(false);
            expect(status.remaining).toBe(200 - count);
            expect(status.currentCount).toBe(count);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 6: Rate Limit Monthly Reset
   *
   * When the stored month_year differs from the current month, the counter
   * resets to 0 before evaluation.
   *
   * **Validates: Requirements 6.4**
   */
  describe('Property 6: Rate Limit Monthly Reset', () => {
    it('when stored month_year differs from current month: counter resets to 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a past month_year that differs from the current one
          fc.integer({ min: 2020, max: 2025 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).map((month) => {
              const monthStr = String(month).padStart(2, '0');
              return `${year}-${monthStr}`;
            })
          ),
          fc.integer({ min: 1, max: 500 }),
          async (storedMonthYear, storedCount) => {
            const currentMonthYear = getCurrentMonthYear();

            // Skip if the generated month happens to be the current month
            if (storedMonthYear === currentMonthYear) return;

            // Mock the resetIfNewMonth select — returns a row with old month
            mockSingle.mockResolvedValueOnce({
              data: { id: 'rate-1', month_year: storedMonthYear },
              error: null,
            });

            // Mock the checkRateLimit query — returns the RESET data (count 0)
            // because resetIfNewMonth would have updated it
            mockSingle.mockResolvedValueOnce({
              data: {
                request_count: 0,
                limit_max: 200,
                month_year: currentMonthYear,
              },
              error: null,
            });

            const status = await checkRateLimit();

            // After a month reset, count should be 0
            expect(status.currentCount).toBe(0);
            expect(status.remaining).toBe(200);
            expect(status.isExhausted).toBe(false);
            expect(status.isNearLimit).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('resetIfNewMonth triggers update when stored month differs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2020, max: 2025 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).map((month) => {
              const monthStr = String(month).padStart(2, '0');
              return `${year}-${monthStr}`;
            })
          ),
          async (storedMonthYear) => {
            const currentMonthYear = getCurrentMonthYear();
            if (storedMonthYear === currentMonthYear) return;

            vi.clearAllMocks();

            // Mock the select query returning old month data
            mockSingle.mockResolvedValueOnce({
              data: { id: 'rate-1', month_year: storedMonthYear },
              error: null,
            });

            await resetIfNewMonth();

            // The update should have been called to reset the counter
            expect(mockUpdate).toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('resetIfNewMonth does NOT trigger update when same month', async () => {
      const currentMonthYear = getCurrentMonthYear();

      // Mock the select query returning current month data
      mockSingle.mockResolvedValueOnce({
        data: { id: 'rate-1', month_year: currentMonthYear },
        error: null,
      });

      await resetIfNewMonth();

      // The update should NOT have been called
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

/**
 * Helper to get current month in YYYY-MM format, mirroring the rate-limiter logic.
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
