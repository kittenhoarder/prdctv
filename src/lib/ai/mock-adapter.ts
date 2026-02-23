import type {
  AIProvider,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  GenerateBriefInput,
  FrameBrief,
  GenerateOverlayInput,
  MirrorOverlay,
  Result,
} from "./types";

const QUESTIONS_FIXTURE: GenerateQuestionsOutput = {
  questions: [
    "What is the single most important outcome that would make this meeting a success?",
    "Who in the room has the authority to block progress, and what are their concerns?",
    "What's the most likely reason this meeting might end without a decision?",
  ],
};

const BRIEF_FIXTURE: FrameBrief = {
  realGoal: "Reach a clear decision that everyone will actually act on",
  constraint:
    "Limited time and pre-existing opinions that haven't been aired",
  mustAgree: "What the one concrete next step is and who owns it",
  badOutcome:
    "Meeting ends with 'let's take this offline' — no decision, no owner",
  agenda:
    "1. State the decision to be made (2 min) 2. Share relevant context (5 min) 3. Surface concerns (5 min) 4. Decide and assign owner (3 min)",
  openingReadout:
    "We're here to make one decision today. I'll share the key context in five minutes, then I want to hear concerns before we lock in. By the end of this meeting, we'll have a clear answer and one person who owns it.",
};

const OVERLAY_FIXTURE: MirrorOverlay = {
  divergences: [
    {
      intended: "The change benefits the whole team",
      received: "The change primarily benefits one group",
      gapSummary:
        "Audience didn't see personal benefit — framing was too abstract",
    },
    {
      intended: "This is a well-considered decision",
      received: "This decision was made without consulting us",
      gapSummary: "Process wasn't communicated; audience felt excluded",
    },
  ],
  themes: [
    { theme: "Lack of consultation", count: 3 },
    { theme: "Timeline concerns", count: 2 },
  ],
  followUp:
    "Thank you for your feedback. I want to address two things directly: first, this decision was made after reviewing input from multiple stakeholders over the past month — I should have made that process more visible. Second, if the timeline is a concern, let's talk through it together this week. I'm sharing a brief summary of the reasoning by EOD today so everyone has the full picture.",
};

/**
 * Mock adapter — deterministic fixture data, no API calls. Default in local dev (AI_PROVIDER=mock).
 */
export class MockAdapter implements AIProvider {
  async generateQuestions(
    _: GenerateQuestionsInput
  ): Promise<Result<GenerateQuestionsOutput, never>> {
    return { ok: true, data: QUESTIONS_FIXTURE };
  }

  async generateBrief(
    _: GenerateBriefInput
  ): Promise<Result<FrameBrief, never>> {
    return { ok: true, data: BRIEF_FIXTURE };
  }

  async generateOverlay(
    _: GenerateOverlayInput
  ): Promise<Result<MirrorOverlay, never>> {
    return { ok: true, data: OVERLAY_FIXTURE };
  }
}
