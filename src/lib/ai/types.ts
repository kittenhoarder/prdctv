/**
 * AI provider contract: named methods with explicit input/output and typed errors.
 * Used by mock and OpenRouter adapters; routes call these instead of raw generate<T>.
 */

export type RawFallback = { _raw: true; text: string };

export function isRawFallback(x: unknown): x is RawFallback {
  return (
    typeof x === "object" &&
    x !== null &&
    "_raw" in x &&
    (x as RawFallback)._raw === true &&
    typeof (x as RawFallback).text === "string"
  );
}

export type GenerateQuestionsInput = {
  title: string;
  meetingType: "small" | "presentation";
  audience: string;
  stakes: string;
  desiredOutcome: string;
  context: string;
};

export type GenerateQuestionsOutput =
  | { questions: [string, string, string] }
  | RawFallback;

export type GenerateBriefInput = {
  title: string;
  meetingType: string;
  audience: string;
  stakes: string;
  desiredOutcome: string;
  context: string;
  questions: Array<{ q: string; editedQ?: string; answer?: string }>;
};

export type FrameBriefStructured = {
  realGoal: string;
  constraint: string;
  mustAgree: string;
  badOutcome: string;
  agenda: string;
  openingReadout: string;
};

export type FrameBrief = FrameBriefStructured | RawFallback;

export type GenerateOverlayInput = {
  intent: string;
  keyMessage: string;
  desiredAction: string;
  responses: Array<{ understood: string; unclear: string; concerns: string }>;
};

export type MirrorOverlayStructured = {
  divergences: Array<{
    intended: string;
    received: string;
    gapSummary: string;
  }>;
  themes: Array<{ theme: string; count: number }>;
  followUp: string;
};

export type MirrorOverlay = MirrorOverlayStructured | RawFallback;

export type AIErrorCode = "timeout" | "validation" | "provider";

export type AIFailure = { code: AIErrorCode; message: string };

export type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface AIProvider {
  generateQuestions(
    input: GenerateQuestionsInput
  ): Promise<Result<GenerateQuestionsOutput, AIFailure>>;
  generateBrief(
    input: GenerateBriefInput
  ): Promise<Result<FrameBrief, AIFailure>>;
  generateOverlay(
    input: GenerateOverlayInput
  ): Promise<Result<MirrorOverlay, AIFailure>>;
}
