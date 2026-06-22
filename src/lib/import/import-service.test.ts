/**
 * Property-based tests for Import Service — Job Mapping Completeness
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.5**
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import type { JSearchJob } from './types';

// Mock the Supabase admin client (mapJobToRecord doesn't use it, but module imports it)
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

// Mock dependencies that import-service.ts imports
vi.mock('./rate-limiter', () => ({
  checkRateLimit: vi.fn(),
  incrementRequestCount: vi.fn(),
}));

vi.mock('./response-cache', () => ({
  getCachedResponse: vi.fn(),
  storeCachedResponse: vi.fn(),
}));

vi.mock('./jsearch-client', () => ({
  fetchJobs: vi.fn(),
}));

vi.mock('./deduplication', () => ({
  findExistingExternalIds: vi.fn(),
  isNewJob: vi.fn(),
}));

vi.mock('./skill-extractor', () => ({
  extractSkillsFromJob: vi.fn(),
  insertSkillsForJob: vi.fn(),
}));

import { mapJobToRecord } from './import-service';

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

/**
 * Generates an arbitrary JSearchJob object with all required fields.
 * Uses smart constraints to generate realistic but diverse values.
 */
const arbJSearchJob: fc.Arbitrary<JSearchJob> = fc.record({
  job_id: fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/),
  job_title: fc.string({ minLength: 1, maxLength: 200 }),
  employer_name: fc.string({ minLength: 1, maxLength: 150 }),
  employer_logo: fc.option(fc.webUrl(), { nil: null }),
  job_description: fc.string({ minLength: 1, maxLength: 2000 }),
  job_city: fc.string({ minLength: 1, maxLength: 100 }),
  job_state: fc.string({ minLength: 1, maxLength: 100 }),
  job_country: fc.string({ minLength: 1, maxLength: 100 }),
  job_employment_type: fc.constantFrom(
    'FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERN'
  ),
  job_apply_link: fc.webUrl(),
  job_highlights: fc.record({
    Qualifications: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
      { nil: undefined }
    ),
    Responsibilities: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
      { nil: undefined }
    ),
    Benefits: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
      { nil: undefined }
    ),
  }),
  job_min_salary: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
  job_max_salary: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: null }),
  job_salary_currency: fc.option(fc.constantFrom('USD', 'PHP', 'EUR', 'GBP'), { nil: null }),
  job_salary_period: fc.option(fc.constantFrom('month', 'year', 'hour', 'week'), { nil: null }),
  job_posted_at_datetime_utc: fc.integer({ min: 946684800000, max: 1924905599000 }).map((ts) => new Date(ts).toISOString()),
});

/**
 * Generates a valid UUID-like system user ID.
 */
const arbSystemUserId = fc.uuid();

/**
 * Generates a valid API source.
 */
const arbApiSource: fc.Arbitrary<'jsearch' | 'indeed'> = fc.constantFrom('jsearch', 'indeed');

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Import Service - Property Tests', () => {
  /**
   * Property 2: Job Mapping Completeness
   *
   * For any valid JSearchJob object, the mapped job_descriptions database record
   * SHALL contain all expected fields with correct values mapped from the source.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.5**
   */
  describe('Property 2: Job Mapping Completeness', () => {
    it('all JSearchJob fields map correctly to job_descriptions columns', () => {
      fc.assert(
        fc.property(
          arbJSearchJob,
          arbSystemUserId,
          arbApiSource,
          (job, systemUserId, apiSource) => {
            const record = mapJobToRecord(job, systemUserId, apiSource);

            // Requirement 3.1: job title, description mapped from API response
            expect(record.title).toBe(job.job_title);
            expect(record.description).toBe(job.job_description);

            // Requirement 3.2: assigned to System_User as hr_user_id
            expect(record.hr_user_id).toBe(systemUserId);

            // Requirement 3.3: status set to 'published'
            expect(record.status).toBe('published');

            // Requirement 3.5: external_job_id stored for deduplication
            expect(record.external_job_id).toBe(job.job_id);

            // Requirement 3.4: source attribution — source field
            expect(record.source).toBe(apiSource);

            // Requirement 3.4: source attribution — original company name
            expect(record.source_company).toBe(job.employer_name);

            // Requirement 3.4: source attribution — original job link
            expect(record.job_link).toBe(job.job_apply_link);

            // Requirement 3.6: salary metadata mapped
            expect(record.salary_min).toBe(job.job_min_salary);
            expect(record.salary_max).toBe(job.job_max_salary);
            expect(record.salary_currency).toBe(job.job_salary_currency);
            expect(record.salary_period).toBe(job.job_salary_period);

            // Requirement 3.6: employment type mapped
            expect(record.employment_type).toBe(job.job_employment_type);

            // Requirement 3.6: location mapped
            expect(record.location_city).toBe(job.job_city);
            expect(record.location_state).toBe(job.job_state);

            // Requirement 3.6: highlights stored (jsonb)
            expect(record.highlights).toEqual(job.job_highlights ?? null);

            // Requirement 10.5: imported_at is set (non-null ISO timestamp)
            expect(record.imported_at).toBeDefined();
            expect(typeof record.imported_at).toBe('string');
            // Verify it's a valid ISO date string
            const parsedDate = new Date(record.imported_at);
            expect(parsedDate.getTime()).not.toBeNaN();
          }
        ),
        { numRuns: 200 }
      );
    });

    it('source field is always "jsearch" or "indeed" matching apiSource', () => {
      fc.assert(
        fc.property(
          arbJSearchJob,
          arbSystemUserId,
          arbApiSource,
          (job, systemUserId, apiSource) => {
            const record = mapJobToRecord(job, systemUserId, apiSource);

            expect(['jsearch', 'indeed']).toContain(record.source);
            expect(record.source).toBe(apiSource);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('imported_at is always a recent timestamp (within last minute)', () => {
      fc.assert(
        fc.property(
          arbJSearchJob,
          arbSystemUserId,
          arbApiSource,
          (job, systemUserId, apiSource) => {
            const before = Date.now();
            const record = mapJobToRecord(job, systemUserId, apiSource);
            const after = Date.now();

            const importedAt = new Date(record.imported_at).getTime();
            expect(importedAt).toBeGreaterThanOrEqual(before);
            expect(importedAt).toBeLessThanOrEqual(after);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('highlights defaults to null when job_highlights is undefined/null', () => {
      fc.assert(
        fc.property(
          arbSystemUserId,
          arbApiSource,
          (systemUserId, apiSource) => {
            // Create a job with explicitly undefined highlights (cast to satisfy types)
            const jobWithNoHighlights: JSearchJob = {
              job_id: 'test-id',
              job_title: 'Test Job',
              employer_name: 'Test Corp',
              employer_logo: null,
              job_description: 'A test job description',
              job_city: 'Manila',
              job_state: 'Metro Manila',
              job_country: 'Philippines',
              job_employment_type: 'FULLTIME',
              job_apply_link: 'https://example.com/apply',
              job_highlights: undefined as unknown as JSearchJob['job_highlights'],
              job_min_salary: null,
              job_max_salary: null,
              job_salary_currency: null,
              job_salary_period: null,
              job_posted_at_datetime_utc: '2024-01-01T00:00:00Z',
            };

            const record = mapJobToRecord(jobWithNoHighlights, systemUserId, apiSource);
            expect(record.highlights).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('null salary values are preserved as null in the mapped record', () => {
      fc.assert(
        fc.property(
          arbSystemUserId,
          arbApiSource,
          (systemUserId, apiSource) => {
            const jobWithNullSalary: JSearchJob = {
              job_id: 'test-null-salary',
              job_title: 'Engineer',
              employer_name: 'Company',
              employer_logo: null,
              job_description: 'Description',
              job_city: 'City',
              job_state: 'State',
              job_country: 'PH',
              job_employment_type: 'FULLTIME',
              job_apply_link: 'https://example.com',
              job_highlights: { Qualifications: ['Node.js'] },
              job_min_salary: null,
              job_max_salary: null,
              job_salary_currency: null,
              job_salary_period: null,
              job_posted_at_datetime_utc: '2024-06-01T00:00:00Z',
            };

            const record = mapJobToRecord(jobWithNullSalary, systemUserId, apiSource);
            expect(record.salary_min).toBeNull();
            expect(record.salary_max).toBeNull();
            expect(record.salary_currency).toBeNull();
            expect(record.salary_period).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
