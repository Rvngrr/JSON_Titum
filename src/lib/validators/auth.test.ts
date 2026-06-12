import { describe, it, expect } from "vitest";
import { validatePassword, validateEmail } from "./auth";

describe("validatePassword", () => {
  it("accepts a valid password with all requirements met", () => {
    const result = validatePassword("ValidPass1");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = validatePassword("Ab1cdef");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
  });

  it("rejects a password without an uppercase letter", () => {
    const result = validatePassword("lowercase1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
  });

  it("rejects a password without a lowercase letter", () => {
    const result = validatePassword("UPPERCASE1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one lowercase letter"
    );
  });

  it("rejects a password without a number", () => {
    const result = validatePassword("NoNumbers");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("reports all errors for a completely invalid password", () => {
    const result = validatePassword("abc");
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3); // too short, no uppercase, no number
  });

  it("accepts exactly 8 characters with all requirements", () => {
    const result = validatePassword("Abcdefg1");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects an empty password with all error messages", () => {
    const result = validatePassword("");
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });
});

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects an email without @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects an email without domain", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("rejects an email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
  });
});
