import { z } from "zod";

/** Validates LLM response for generateQuestions. */
export const generateQuestionsOutputSchema = z.object({
  questions: z.tuple([z.string(), z.string(), z.string()]),
});

/** Validates LLM response for generateBrief. */
export const frameBriefSchema = z.object({
  realGoal: z.string(),
  constraint: z.string(),
  mustAgree: z.string(),
  badOutcome: z.string(),
  agenda: z.string(),
  openingReadout: z.string(),
});

const divergenceSchema = z.object({
  intended: z.string(),
  received: z.string(),
  gapSummary: z.string(),
});

const themeSchema = z.object({
  theme: z.string(),
  count: z.number(),
});

/** Validates LLM response for generateOverlay. */
export const mirrorOverlaySchema = z.object({
  divergences: z.array(divergenceSchema).min(1).max(3),
  themes: z.array(themeSchema),
  followUp: z.string(),
});

