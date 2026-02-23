import { describe, it, expect } from "vitest";
import { sanitizeStrings } from "@/lib/sanitize";
import {
  createFrameBodySchema,
  tokenParamSchema,
  answerQuestionsBodySchema,
  mirrorIntentInputSchema,
  mirrorResponseInputSchema,
} from "./schemas";

describe("createFrameBodySchema", () => {
  const valid = {
    title: "Q1 Planning",
    type: "small",
    audience: "Engineering",
    stakes: "low",
    outcome: "Align on scope",
    context: "We need to decide by Friday.",
  };

  it("accepts valid input", () => {
    const sanitized = sanitizeStrings(valid);
    const result = createFrameBodySchema.safeParse(sanitized);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Q1 Planning");
      expect(result.data.meetingType).toBe("small");
      expect(result.data.desiredOutcome).toBe("Align on scope");
    }
  });

  it("rejects title over 200 chars", () => {
    const long = { ...valid, title: "a".repeat(201) };
    const result = createFrameBodySchema.safeParse(sanitizeStrings(long));
    expect(result.success).toBe(false);
  });

  it("strips HTML from strings before validation", () => {
    const withHtml = { ...valid, title: "  <script>x</script> Q1  " };
    const sanitized = sanitizeStrings(withHtml);
    const result = createFrameBodySchema.safeParse(sanitized);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).not.toContain("<");
      expect(result.data.title).toContain("Q1");
    }
  });
});

describe("tokenParamSchema", () => {
  it("accepts 21-char alphanumeric token", () => {
    const token = "V1StGXR8_Z5jdHi6B-myT";
    expect(tokenParamSchema.safeParse(token).success).toBe(true);
  });

  it("rejects 20 chars", () => {
    expect(tokenParamSchema.safeParse("a".repeat(20)).success).toBe(false);
  });

  it("rejects invalid chars", () => {
    expect(tokenParamSchema.safeParse("V1StGXR8_Z5jdHi6B-myT!").success).toBe(false);
  });
});

describe("answerQuestionsBodySchema", () => {
  const valid = {
    answers: [
      { question: "Q1?", answer: "A1" },
      { question: "Q2?", answer: "A2" },
      { question: "Q3?", answer: "A3" },
    ],
  };

  it("accepts valid input", () => {
    const result = answerQuestionsBodySchema.safeParse(sanitizeStrings(valid));
    expect(result.success).toBe(true);
  });

  it("rejects array of 2", () => {
    const result = answerQuestionsBodySchema.safeParse(
      sanitizeStrings({ answers: valid.answers.slice(0, 2) })
    );
    expect(result.success).toBe(false);
  });

  it("rejects answer over 1000 chars", () => {
    const long = {
      answers: [
        { question: "Q1?", answer: "a".repeat(1001) },
        { question: "Q2?", answer: "A2" },
        { question: "Q3?", answer: "A3" },
      ],
    };
    const result = answerQuestionsBodySchema.safeParse(sanitizeStrings(long));
    expect(result.success).toBe(false);
  });
});

describe("mirrorIntentInputSchema", () => {
  const validWithFrame = {
    frameToken: "V1StGXR8_Z5jdHi6B-myT",
    intent: "Share timeline",
    keyMessage: "Launch in March",
    desiredAction: "Review by Friday",
  };

  it("accepts valid input with frameToken", () => {
    const result = mirrorIntentInputSchema.safeParse(sanitizeStrings(validWithFrame));
    expect(result.success).toBe(true);
  });

  it("accepts valid input without frameToken (Mirror-only)", () => {
    const withoutFrame = {
      intent: "Share timeline",
      keyMessage: "Launch in March",
      desiredAction: "Review by Friday",
    };
    const result = mirrorIntentInputSchema.safeParse(sanitizeStrings(withoutFrame));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.frameToken).toBeUndefined();
  });

  it("rejects intent over 1000 chars", () => {
    const long = { ...validWithFrame, intent: "a".repeat(1001) };
    expect(mirrorIntentInputSchema.safeParse(sanitizeStrings(long)).success).toBe(false);
  });
});

describe("mirrorResponseInputSchema", () => {
  const valid = {
    understood: "The timeline",
    unclear: "The scope",
    concerns: "Resource allocation",
  };

  it("accepts valid input", () => {
    const result = mirrorResponseInputSchema.safeParse(sanitizeStrings(valid));
    expect(result.success).toBe(true);
  });

  it("rejects HTML in understood after sanitize", () => {
    const withHtml = { ...valid, understood: "<b>bold</b> text" };
    const sanitized = sanitizeStrings(withHtml);
    const result = mirrorResponseInputSchema.safeParse(sanitized);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.understood).not.toContain("<");
  });
});
