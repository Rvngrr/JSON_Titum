import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock the Supabase admin client
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: mockSelect,
      update: mockUpdate,
    }),
  }),
}));

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/lockout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("input validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const request = new Request("http://localhost/api/auth/lockout", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid request body");
    });

    it("returns 400 when email is missing", async () => {
      const request = createRequest({ action: "check" });
      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 400 when action is missing", async () => {
      const request = createRequest({ email: "test@example.com" });
      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Missing required fields");
    });

    it("returns 400 for invalid action value", async () => {
      const request = createRequest({
        email: "test@example.com",
        action: "invalid",
      });
      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Invalid action");
    });
  });

  describe("check action", () => {
    it("returns unlocked status for account with no failed attempts", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 0,
          locked_until: null,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "check",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(false);
      expect(data.remainingMs).toBe(0);
      expect(data.failedAttempts).toBe(0);
    });

    it("returns locked status with remaining time for locked account", async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 5,
          locked_until: futureTime,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "check",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(true);
      expect(data.remainingMs).toBeGreaterThan(0);
      expect(data.failedAttempts).toBe(5);
      expect(data.message).toContain("Account is locked");
    });

    it("returns unlocked status for expired lock", async () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 5,
          locked_until: pastTime,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "check",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(false);
      expect(data.remainingMs).toBe(0);
    });

    it("returns generic unlocked response for unknown email", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

      const request = createRequest({
        email: "unknown@example.com",
        action: "check",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locked).toBe(false);
    });
  });

  describe("increment action", () => {
    it("increments counter on failed attempt", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 2,
          locked_until: null,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "increment",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(false);
      expect(data.failedAttempts).toBe(3);
    });

    it("locks account after 5 consecutive failures", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 4,
          locked_until: null,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "increment",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(true);
      expect(data.failedAttempts).toBe(5);
      expect(data.remainingMs).toBe(15 * 60 * 1000);
      expect(data.message).toContain("Account locked");
    });

    it("returns locked status if account is already locked", async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 5,
          locked_until: futureTime,
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "increment",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(true);
      expect(data.message).toContain("Account is locked");
    });
  });

  describe("reset action", () => {
    it("resets failed attempts and clears lock", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "user-1",
          email: "test@example.com",
          failed_login_attempts: 5,
          locked_until: new Date().toISOString(),
        },
        error: null,
      });

      const request = createRequest({
        email: "test@example.com",
        action: "reset",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.locked).toBe(false);
      expect(data.remainingMs).toBe(0);
      expect(data.failedAttempts).toBe(0);
    });
  });
});
