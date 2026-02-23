import { describe, it, expect } from "vitest";
import {
  generateQuestionsOutputSchema,
  frameBriefSchema,
  mirrorOverlaySchema,
} from "./schemas";

describe("generateQuestionsOutputSchema", () => {
  it("accepts valid 3-tuple of strings", () => {
    const valid = { questions: ["Q1?", "Q2?", "Q3?"] };
    const result = generateQuestionsOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects 2 questions", () => {
    const invalid = { questions: ["Q1?", "Q2?"] };
    const result = generateQuestionsOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects non-array", () => {
    const result = generateQuestionsOutputSchema.safeParse({ questions: "not array" });
    expect(result.success).toBe(false);
  });
});

describe("frameBriefSchema", () => {
  const valid = {
    realGoal: "Decide scope",
    constraint: "Time",
    mustAgree: "Owner",
    badOutcome: "No decision",
    agenda: "1. Intro 2. Decide",
    openingReadout: "We're here to decide.",
  };

  it("accepts valid brief", () => {
    const result = frameBriefSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing field", () => {
    const { openingReadout: _o, ...missing } = valid;
    const result = frameBriefSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });
});

describe("mirrorOverlaySchema", () => {
  const valid = {
    divergences: [
      { intended: "I", received: "R", gapSummary: "G" },
    ],
    themes: [{ theme: "T", count: 1 }],
    followUp: "Thanks.",
  };

  it("accepts valid overlay", () => {
    const result = mirrorOverlaySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty divergences", () => {
    const result = mirrorOverlaySchema.safeParse({
      ...valid,
      divergences: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed JSON (wrong type) as validation failure", () => {
    const result = mirrorOverlaySchema.safeParse({
      divergences: "not array",
      themes: [],
      followUp: "x",
    });
    expect(result.success).toBe(false);
  });
});
