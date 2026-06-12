import { describe, it, expect } from "vitest";

describe("Test setup", () => {
  it("should run tests successfully", () => {
    expect(true).toBe(true);
  });

  it("should resolve path aliases", async () => {
    const types = await import("@/types");
    expect(types).toBeDefined();
  });
});
