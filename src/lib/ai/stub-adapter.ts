import type { AIProvider, AIGenerateOptions, AIProviderResult } from "./provider";

/**
 * Stub adapter — returns realistic demo data without making API calls.
 * Activated when ENABLE_AI=false or AI_PROVIDER=stub.
 */
export class StubAdapter implements AIProvider {
  async generate<T>(options: AIGenerateOptions): Promise<AIProviderResult<T>> {
    // Detect which function is being called from the system prompt content
    const systemMsg = options.messages.find((m) => m.role === "system")?.content ?? "";

    let data: unknown;

    if (systemMsg.includes("clarifying questions")) {
      data = {
        questions: [
          "What is the single most important outcome that would make this meeting a success?",
          "Who in the room has the authority to block progress, and what are their concerns?",
          "What's the most likely reason this meeting might end without a decision?",
        ],
      };
    } else if (systemMsg.includes("Frame Brief")) {
      data = {
        realGoal: "Reach a clear decision that everyone will actually act on",
        constraint: "Limited time and pre-existing opinions that haven't been aired",
        mustAgree: "What the one concrete next step is and who owns it",
        badOutcome: "Meeting ends with 'let's take this offline' — no decision, no owner",
        agenda:
          "1. State the decision to be made (2 min) 2. Share relevant context (5 min) 3. Surface concerns (5 min) 4. Decide and assign owner (3 min)",
        openingReadout:
          "We're here to make one decision today. I'll share the key context in five minutes, then I want to hear concerns before we lock in. By the end of this meeting, we'll have a clear answer and one person who owns it.",
      };
    } else if (systemMsg.includes("communication gap")) {
      data = {
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
    } else {
      data = {};
    }

    return {
      data: data as T,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}
