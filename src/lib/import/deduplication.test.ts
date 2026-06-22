/**
 * Property-based tests for Deduplication Checker
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 9.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the Supabase admin client before importing the module under test
const mockNot = vi.fn();
const mockIn = vi.fn(() => ({ not: mockNot }));
const mockSelect = vi.fn(() => ({ in: mockIn }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
    }),
  }),
}));

import { findExistingExternalIds, isNewJob } from './deduplication';

describe('Deduplication Checker - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 3: Import Idempotence
   *
   * For any set of job IDs, calling findExistingExternalIds with those IDs
   * and then checking isNewJob should correctly identify all as not-new
   * (simulating a second import where all are already in the DB).
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  describe('Property 3: Import Idempotence', () => {
    it('for any set of job IDs already in DB, all are identified as not-new (second import produces zero new records)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a non-empty array of unique external job IDs
          fc.uniqueArray(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            { minLength: 1, maxLength: 20 }
          ),
          async (externalIds) => {
            // Simulate that ALL these IDs already exist in the database
            // (as would happen on a second import of the same set)
            const dbRows = externalIds.map((id) => ({ external_job_id: id }));

            mockNot.mockResolvedValueOnce({
              data: dbRows,
              error: null,
            });

            // First call: find which IDs already exist
            const existingIds = await findExistingExternalIds(externalIds);

            // Second import check: every single ID should be identified as NOT new
            for (const id of externalIds) {
              expect(isNewJob(id, existingIds)).toBe(false);
            }

            // The count of "new" jobs on second import is zero
            const newCount = externalIds.filter((id) => isNewJob(id, existingIds)).length;
            expect(newCount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any set of job IDs NOT in DB, all are identified as new (first import)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            { minLength: 1, maxLength: 20 }
          ),
          async (externalIds) => {
            // Simulate that NONE of these IDs exist in the database (first import)
            mockNot.mockResolvedValueOnce({
              data: [],
              error: null,
            });

            const existingIds = await findExistingExternalIds(externalIds);

            // Every ID should be identified as new
            for (const id of externalIds) {
              expect(isNewJob(id, existingIds)).toBe(true);
            }

            const newCount = externalIds.filter((id) => isNewJob(id, existingIds)).length;
            expect(newCount).toBe(externalIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Import Count Invariant
   *
   * For any array of N total jobs, splitting them into imported (new)
   * and skipped (duplicates) should always sum to N.
   * importedCount + skippedDuplicates = total jobs
   *
   * **Validates: Requirements 5.3, 9.5**
   */
  describe('Property 4: Import Count Invariant', () => {
    it('for any N total jobs, importedCount + skippedDuplicates always equals N', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate total job IDs
          fc.uniqueArray(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            { minLength: 1, maxLength: 30 }
          ),
          // Generate a subset size (number of already-existing IDs)
          fc.nat(),
          async (allJobIds, subsetSeed) => {
            const totalJobs = allJobIds.length;

            // Determine how many of the jobs are "already imported" (duplicates)
            const duplicateCount = subsetSeed % (totalJobs + 1); // 0 to totalJobs
            const existingInDb = allJobIds.slice(0, duplicateCount);

            // Mock the database response: only the first `duplicateCount` IDs exist
            const dbRows = existingInDb.map((id) => ({ external_job_id: id }));
            mockNot.mockResolvedValueOnce({
              data: dbRows,
              error: null,
            });

            const existingIds = await findExistingExternalIds(allJobIds);

            // Count imported (new) and skipped (duplicates)
            let importedCount = 0;
            let skippedDuplicates = 0;

            for (const id of allJobIds) {
              if (isNewJob(id, existingIds)) {
                importedCount++;
              } else {
                skippedDuplicates++;
              }
            }

            // The invariant: imported + skipped === total
            expect(importedCount + skippedDuplicates).toBe(totalJobs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skippedDuplicates equals the number of IDs found in DB', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(
            fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
            { minLength: 2, maxLength: 20 }
          ),
          fc.nat(),
          async (allJobIds, subsetSeed) => {
            const totalJobs = allJobIds.length;
            const duplicateCount = subsetSeed % (totalJobs + 1);
            const existingInDb = allJobIds.slice(0, duplicateCount);

            const dbRows = existingInDb.map((id) => ({ external_job_id: id }));
            mockNot.mockResolvedValueOnce({
              data: dbRows,
              error: null,
            });

            const existingIds = await findExistingExternalIds(allJobIds);

            const skippedDuplicates = allJobIds.filter(
              (id) => !isNewJob(id, existingIds)
            ).length;

            // Skipped count should equal the number of existing IDs returned by DB
            expect(skippedDuplicates).toBe(duplicateCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
