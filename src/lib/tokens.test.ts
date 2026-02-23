import { describe, it, expect } from "vitest";
import { generateToken, timingSafeEqualToken } from "./tokens";
import { tokenParamSchema } from "@/lib/validation/schemas";

describe("generateToken", () => {
  it("returns 21-char string", () => {
    const token = generateToken();
    expect(token).toHaveLength(21);
  });

  it("matches TokenParam schema", () => {
    const token = generateToken();
    const result = tokenParamSchema.safeParse(token);
    expect(result.success).toBe(true);
  });

  it("uses URL-safe charset", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("timingSafeEqualToken", () => {
  it("returns true for identical 21-char tokens", () => {
    const a = "V1StGXR8_Z5jdHi6B-myT";
    expect(timingSafeEqualToken(a, a)).toBe(true);
  });

  it("returns false for different 21-char tokens", () => {
    const a = "V1StGXR8_Z5jdHi6B-myT";
    const b = "V1StGXR8_Z5jdHi6B-myU";
    expect(timingSafeEqualToken(a, b)).toBe(false);
  });

  it("returns false for wrong length", () => {
    expect(timingSafeEqualToken("short", "short")).toBe(false);
    expect(timingSafeEqualToken("V1StGXR8_Z5jdHi6B-myT", "short")).toBe(false);
  });
});
