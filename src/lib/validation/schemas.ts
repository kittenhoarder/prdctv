import { z } from "zod";

/** Nanoid-style token: 21 chars, URL-safe alphanumeric. */
export const tokenParamSchema = z
  .string()
  .length(21)
  .regex(/^[A-Za-z0-9_-]+$/);

export type TokenParam = z.infer<typeof tokenParamSchema>;

const trimmedString = (min: number, max: number) =>
  z.string().min(min).max(max);

/** POST /api/frame body. Maps to DB: type=meetingType, outcome=desiredOutcome. */
export const createFrameInputSchema = z.object({
  title: trimmedString(1, 200),
  meetingType: z.enum(["small", "presentation"]),
  audience: trimmedString(1, 500),
  stakes: z.enum(["low", "medium", "high", "critical"]),
  desiredOutcome: trimmedString(1, 500),
  context: trimmedString(0, 3000),
});

export type CreateFrameInput = z.infer<typeof createFrameInputSchema>;

/** Accept legacy keys (type, outcome) from client. */
export const createFrameBodySchema = z
  .object({
    title: trimmedString(1, 200),
    type: z.enum(["small", "presentation"]).optional(),
    meetingType: z.enum(["small", "presentation"]).optional(),
    audience: trimmedString(1, 500),
    stakes: z.enum(["low", "medium", "high", "critical"]),
    outcome: trimmedString(1, 500).optional(),
    desiredOutcome: trimmedString(1, 500).optional(),
    context: trimmedString(0, 3000).optional(),
  })
  .refine((v) => v.type != null || v.meetingType != null, { message: "type or meetingType required" })
  .refine((v) => v.outcome != null || v.desiredOutcome != null, { message: "outcome or desiredOutcome required" })
  .transform((v) => ({
    title: v.title,
    meetingType: (v.meetingType ?? v.type)!,
    audience: v.audience,
    stakes: v.stakes,
    desiredOutcome: (v.desiredOutcome ?? v.outcome)!,
    context: v.context ?? "",
  }));

/** PUT /api/frame/[token]/answers body. Canonical: 3 strings. Also accept current client shape (objects with question/answer). */
export const answerQuestionsInputSchema = z.object({
  answers: z.tuple([
    trimmedString(1, 1000),
    trimmedString(1, 1000),
    trimmedString(1, 1000),
  ]),
});

export const answerQuestionsBodySchema = z.object({
  answers: z
    .array(
      z.object({
        question: trimmedString(1, 1000),
        editedQuestion: trimmedString(1, 1000).optional(),
        answer: trimmedString(1, 1000),
      })
    )
    .length(3),
});

export type AnswerQuestionsInput = z.infer<typeof answerQuestionsInputSchema>;

/** POST /api/mirror body (create Mirror session). frameToken optional: omit for Mirror-only (standalone). */
export const mirrorIntentInputSchema = z.object({
  frameToken: trimmedString(21, 21)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  intent: trimmedString(1, 1000),
  keyMessage: trimmedString(1, 1000),
  desiredAction: trimmedString(1, 1000),
  overlayCode: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9\s_-]+$/)
    .optional(),
});

export type MirrorIntentInput = z.infer<typeof mirrorIntentInputSchema>;

/** POST /api/mirror/[mtoken]/respond body. */
export const mirrorResponseInputSchema = z.object({
  understood: trimmedString(1, 1000),
  unclear: trimmedString(1, 1000),
  concerns: trimmedString(1, 1000),
});

export type MirrorResponseInput = z.infer<typeof mirrorResponseInputSchema>;

/** POST /api/feedback body. Product feedback for MVP; no PII beyond user message. */
export const feedbackBodySchema = z.object({
  message: trimmedString(1, 2000),
  kind: z.enum(["bug", "idea", "other"]).optional(),
  source: z.string().max(500).optional(),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
