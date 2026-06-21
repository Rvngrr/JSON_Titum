/**
 * Unit tests for POST /api/jobs/import route
 *
 * Tests authentication (401), authorization (403), successful import,
 * request body parameter parsing, and error response shapes.
 *
 * **Validates: Requirements 9.2, 9.6**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

const mockImportJobs = vi.fn();
vi.mock("@/lib/import/import-service", () => ({
  importJobs: (...args: unknown[]) => mockImportJobs(...args),
}));

import { POST } from "./route";

// --- Helpers ---

function createRequest(body?: Record<string, unknown>): NextRequest {
  const url = new URL("/api/jobs/import", "http://localhost:3000");
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(url, init as any);
}

function setupAuthenticatedHrUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: "hr_user" },
          error: null,
        }),
      }),
    }),
  });
}

function setupAuthenticatedApplicant() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-456" } },
    error: null,
  });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: "applicant" },
          error: null,
        }),
      }),
    }),
  });
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "No session" },
  });
}

// --- Tests ---

describe("POST /api/jobs/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication - 401 responses", () => {
    it("returns 401 when no user session exists", async () => {
      setupUnauthenticated();

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Authentication required");
    });

    it("returns 401 when auth returns an error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Token expired" },
      });

      const request = createRequest({});
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });

  describe("Authorization - 403 responses", () => {
    it("returns 403 when user is not an hr_user", async () => {
      setupAuthenticatedApplicant();

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Forbidden");
    });

    it("returns 403 for admin role (only hr_user allowed)", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-789" } },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      const request = createRequest({});
      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe("Successful import with default params", () => {
    it("returns 200 with import results on successful import", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 5,
        skippedDuplicates: 2,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
      });

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.importedCount).toBe(5);
      expect(body.skippedDuplicates).toBe(2);
      expect(body.cacheUsed).toBe(false);
      expect(body.cacheTimestamp).toBeNull();
      expect(body.warnings).toEqual([]);
    });

    it("calls importJobs with default params when body is empty", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedDuplicates: 0,
        cacheUsed: true,
        cacheTimestamp: "2024-01-01T00:00:00Z",
        warnings: [],
      });

      const request = createRequest({});
      await POST(request);

      expect(mockImportJobs).toHaveBeenCalledWith({
        query: "software developer",
        location: "Philippines",
        forceRefresh: false,
        apiSource: "jsearch",
      });
    });

    it("returns warnings array when LLM was unavailable", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 3,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: ["LLM unavailable, used local skill extraction fallback"],
      });

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.warnings).toHaveLength(1);
      expect(body.warnings[0]).toContain("LLM unavailable");
    });
  });

  describe("Request body parameter parsing", () => {
    it("accepts custom query parameter", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 1,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
      });

      const request = createRequest({ query: "data engineer" });
      await POST(request);

      expect(mockImportJobs).toHaveBeenCalledWith(
        expect.objectContaining({ query: "data engineer" })
      );
    });

    it("accepts custom location parameter", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 1,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
      });

      const request = createRequest({ location: "Manila" });
      await POST(request);

      expect(mockImportJobs).toHaveBeenCalledWith(
        expect.objectContaining({ location: "Manila" })
      );
    });

    it("accepts forceRefresh=true parameter", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 1,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
      });

      const request = createRequest({ forceRefresh: true });
      await POST(request);

      expect(mockImportJobs).toHaveBeenCalledWith(
        expect.objectContaining({ forceRefresh: true })
      );
    });

    it("returns 400 for invalid query type (non-string)", async () => {
      setupAuthenticatedHrUser();

      const request = createRequest({ query: 123 });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("query");
    });

    it("returns 400 for empty query string", async () => {
      setupAuthenticatedHrUser();

      const request = createRequest({ query: "   " });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("query");
    });

    it("returns 400 for invalid forceRefresh type", async () => {
      setupAuthenticatedHrUser();

      const request = createRequest({ forceRefresh: "yes" });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("forceRefresh");
    });

    it("returns 400 for invalid location type", async () => {
      setupAuthenticatedHrUser();

      const request = createRequest({ location: 42 });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain("location");
    });

    it("trims whitespace from query and location", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: true,
        importedCount: 0,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
      });

      const request = createRequest({
        query: "  react developer  ",
        location: "  Cebu  ",
      });
      await POST(request);

      expect(mockImportJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "react developer",
          location: "Cebu",
        })
      );
    });
  });

  describe("Error response shapes", () => {
    it("returns 429 when rate limit is exhausted", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: false,
        importedCount: 0,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
        error: "Monthly API quota exhausted. 0 requests remaining.",
      });

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error).toContain("quota exhausted");
    });

    it("returns 504 when external API times out (thrown error)", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockRejectedValue(new Error("Request timeout after 30000ms"));

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(504);
      expect(body.success).toBe(false);
      expect(body.error).toContain("timed out");
    });

    it("returns 502 when external API returns an error (thrown error)", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockRejectedValue(new Error("External API returned 503"));

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.success).toBe(false);
      expect(body.error).toContain("External API");
    });

    it("returns 500 for configuration errors in result", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockResolvedValue({
        success: false,
        importedCount: 0,
        skippedDuplicates: 0,
        cacheUsed: false,
        cacheTimestamp: null,
        warnings: [],
        error: "Configuration error: RAPIDAPI_KEY is missing",
      });

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Configuration error");
    });

    it("returns 500 when profile lookup fails", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Unable to verify user role");
    });

    it("returns 500 for unexpected thrown errors", async () => {
      setupAuthenticatedHrUser();
      mockImportJobs.mockRejectedValue(new Error("Something unexpected"));

      const request = createRequest({});
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe("Something unexpected");
    });

    it("all error responses include success: false", async () => {
      // 401
      setupUnauthenticated();
      const r1 = await POST(createRequest({}));
      expect((await r1.json()).success).toBe(false);

      // 403
      vi.clearAllMocks();
      setupAuthenticatedApplicant();
      const r2 = await POST(createRequest({}));
      expect((await r2.json()).success).toBe(false);

      // 400
      vi.clearAllMocks();
      setupAuthenticatedHrUser();
      const r3 = await POST(createRequest({ query: 123 }));
      expect((await r3.json()).success).toBe(false);
    });
  });
});
