import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

import { createServerClient } from "@supabase/ssr";

const mockedCreateServerClient = vi.mocked(createServerClient);

function createMockRequest(pathname: string): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  return new NextRequest(url);
}

function setupMockUser(user: { user_metadata?: { role?: string } } | null) {
  mockedCreateServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as any);
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  describe("unauthenticated users", () => {
    beforeEach(() => {
      setupMockUser(null);
    });

    it("allows access to /login", async () => {
      const request = createMockRequest("/login");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("allows access to /register", async () => {
      const request = createMockRequest("/register");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("allows access to root /", async () => {
      const request = createMockRequest("/");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("redirects to /login when accessing /applicant", async () => {
      const request = createMockRequest("/applicant");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects to /login when accessing /hr", async () => {
      const request = createMockRequest("/hr");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects to /login when accessing /applicant/profile", async () => {
      const request = createMockRequest("/applicant/profile");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });
  });

  describe("authenticated applicant users", () => {
    beforeEach(() => {
      setupMockUser({ user_metadata: { role: "applicant" } });
    });

    it("redirects from /login to /applicant dashboard", async () => {
      const request = createMockRequest("/login");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });

    it("redirects from /register to /applicant dashboard", async () => {
      const request = createMockRequest("/register");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });

    it("redirects from / to /applicant dashboard", async () => {
      const request = createMockRequest("/");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });

    it("allows access to /applicant routes", async () => {
      const request = createMockRequest("/applicant");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("allows access to /applicant/profile", async () => {
      const request = createMockRequest("/applicant/profile");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("redirects from /hr to /applicant (wrong role)", async () => {
      const request = createMockRequest("/hr");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });

    it("redirects from /hr/jobs/new to /applicant (wrong role)", async () => {
      const request = createMockRequest("/hr/jobs/new");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });
  });

  describe("authenticated HR users", () => {
    beforeEach(() => {
      setupMockUser({ user_metadata: { role: "hr_user" } });
    });

    it("redirects from /login to /hr dashboard", async () => {
      const request = createMockRequest("/login");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/hr");
    });

    it("redirects from /register to /hr dashboard", async () => {
      const request = createMockRequest("/register");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/hr");
    });

    it("redirects from / to /hr dashboard", async () => {
      const request = createMockRequest("/");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/hr");
    });

    it("allows access to /hr routes", async () => {
      const request = createMockRequest("/hr");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("allows access to /hr/jobs/new", async () => {
      const request = createMockRequest("/hr/jobs/new");
      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it("redirects from /applicant to /hr (wrong role)", async () => {
      const request = createMockRequest("/applicant");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/hr");
    });

    it("redirects from /applicant/profile to /hr (wrong role)", async () => {
      const request = createMockRequest("/applicant/profile");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/hr");
    });
  });

  describe("authenticated user with no role metadata", () => {
    beforeEach(() => {
      setupMockUser({ user_metadata: {} });
    });

    it("defaults to /applicant dashboard when role is undefined", async () => {
      const request = createMockRequest("/");
      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/applicant");
    });
  });
});
