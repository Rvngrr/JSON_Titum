/**
 * Property-based tests for Response Cache service.
 *
 * **Validates: Requirements 2.1, 2.4**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock the Supabase client before importing the module under test
vi.mock("../supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

import { getCachedResponse, storeCachedResponse } from "./response-cache";
import { createAdminClient } from "../supabase/server";

const mockedCreateAdminClient = vi.mocked(createAdminClient);

/**
 * Arbitrary for generating valid API response objects (Record<string, unknown>)
 * that mimic real-world API responses with nested structures.
 */
const apiResponseArb = (): fc.Arbitrary<Record<string, unknown>> =>
  fc.record({
    status: fc.constantFrom("OK", "success", "error"),
    data: fc.array(
      fc.record({
        job_id: fc.uuid(),
        job_title: fc.string({ minLength: 1, maxLength: 100 }),
        employer_name: fc.string({ minLength: 1, maxLength: 50 }),
        job_description: fc.string({ minLength: 1, maxLength: 500 }),
        job_city: fc.string({ minLength: 1, maxLength: 30 }),
        job_employment_type: fc.constantFrom("full-time", "part-time", "contract"),
        salary: fc.oneof(fc.constant(null), fc.integer({ min: 10000, max: 200000 })),
        highlights: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
      }),
      { minLength: 0, maxLength: 10 }
    ),
    request_id: fc.uuid(),
    metadata: fc.record({
      page: fc.integer({ min: 1, max: 100 }),
      total: fc.integer({ min: 0, max: 1000 }),
    }),
  });

const queryArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const locationArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const apiSourceArb = fc.constantFrom("jsearch" as const, "indeed" as const);

describe("Response Cache — Property Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Cache Round-Trip Preservation
   *
   * For any valid API response object, storing it and then retrieving with
   * the same query/location/apiSource produces a JSON-equal copy of the rawResponse field.
   *
   * **Validates: Requirements 2.1, 2.4**
   */
  it("Property 1: Cache Round-Trip Preservation — storing and retrieving produces JSON-equal rawResponse", async () => {
    await fc.assert(
      fc.asyncProperty(
        queryArb,
        locationArb,
        apiSourceArb,
        apiResponseArb(),
        async (query, location, apiSource, response) => {
          // Simulate in-memory storage that mimics database behavior
          let storedRow: Record<string, unknown> | null = null;

          const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(),
            upsert: vi.fn().mockReturnThis(),
            single: vi.fn(),
          };

          // Configure mock for storeCachedResponse (upsert path)
          const storedId = "test-uuid-" + Math.random().toString(36).slice(2);
          const fetchedAt = new Date().toISOString();
          const jobCount = Array.isArray(response.data)
            ? (response.data as unknown[]).length
            : 0;

          mockSupabase.single.mockImplementation(() => {
            // Simulate the database storing and returning the data
            // The key insight: the DB stores the response as JSONB and returns it
            // JSONB round-trips preserve JSON equality (no loss of data)
            storedRow = {
              id: storedId,
              query,
              location,
              api_source: apiSource,
              raw_response: JSON.parse(JSON.stringify(response)), // Simulate JSONB serialization
              fetched_at: fetchedAt,
              job_count: jobCount,
            };
            return { data: storedRow, error: null };
          });

          // Configure mock for getCachedResponse (select path)
          mockSupabase.maybeSingle.mockImplementation(() => {
            return { data: storedRow, error: null };
          });

          mockedCreateAdminClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createAdminClient>);

          // Store the response
          const stored = await storeCachedResponse(query, location, apiSource, response);

          // Verify the stored response preserves the rawResponse
          expect(stored.rawResponse).toEqual(response);
          expect(stored.query).toBe(query);
          expect(stored.location).toBe(location);
          expect(stored.apiSource).toBe(apiSource);
          expect(stored.jobCount).toBe(jobCount);

          // Retrieve the cached response
          const retrieved = await getCachedResponse(query, location, apiSource);

          // The core property: round-trip preservation
          expect(retrieved).not.toBeNull();
          expect(retrieved!.rawResponse).toEqual(response);

          // Additional structural checks
          expect(retrieved!.query).toBe(query);
          expect(retrieved!.location).toBe(location);
          expect(retrieved!.apiSource).toBe(apiSource);
          expect(retrieved!.id).toBe(storedId);
        }
      ),
      { numRuns: 50 }
    );
  });
});
