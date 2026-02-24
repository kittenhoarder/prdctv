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
  _raw: true as const,
  text: `Real goal: Reach a clear decision that everyone will actually act on

Key constraint: Limited time and pre-existing opinions that haven't been aired

Must agree on: What the one concrete next step is and who owns it

Bad outcome: Meeting ends with 'let's take this offline' — no decision, no owner

Agenda: 1. State the decision to be made (2 min) 2. Share relevant context (5 min) 3. Surface concerns (5 min) 4. Decide and assign owner (3 min)

Opening readout: We're here to make one decision today. I'll share the key context in five minutes, then I want to hear concerns before we lock in. By the end of this meeting, we'll have a clear answer and one person who owns it.`,
};

const OVERLAY_FIXTURE: MirrorOverlay = {
  _raw: true as const,
  text: `Divergences: The change was framed as benefiting the whole team, but the audience heard it as primarily benefiting one group. They also didn't see the decision as well-considered; many felt they weren't consulted and the process wasn't communicated.

Themes: Lack of consultation (3), Timeline concerns (2).

Follow-up: Thank you for your feedback. I want to address two things directly: first, this decision was made after reviewing input from multiple stakeholders over the past month — I should have made that process more visible. Second, if the timeline is a concern, let's talk through it together this week. I'm sharing a brief summary of the reasoning by EOD today so everyone has the full picture.`,
};

/**
 * Mock adapter — deterministic fixture data, no API calls. Default in local dev (AI_PROVIDER=mock).
 */
export class MockAdapter implements AIProvider {
  async generateQuestions(
    _input: GenerateQuestionsInput
  ): Promise<Result<GenerateQuestionsOutput, never>> {
    return { ok: true, data: QUESTIONS_FIXTURE };
  }

  async generateBrief(
    _input: GenerateBriefInput
  ): Promise<Result<FrameBrief, never>> {
    return { ok: true, data: BRIEF_FIXTURE };
  }

  async generateOverlay(
    _input: GenerateOverlayInput
  ): Promise<Result<MirrorOverlay, never>> {
    return { ok: true, data: OVERLAY_FIXTURE };
  }
}
