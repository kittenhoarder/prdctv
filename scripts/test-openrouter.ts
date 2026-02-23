/**
 * One-off script to verify OpenRouter integration with current model selection.
 * Run: npx tsx scripts/test-openrouter.ts
 * Requires .env.local with AI_PROVIDER=openrouter and OPENROUTER_API_KEY set.
 * When OPENROUTER_MODEL_1/2/3 are set, those models are used (in order).
 */
import dotenv from "dotenv";

// Load env before any adapter code so overrides are visible
dotenv.config({ path: ".env.local" });

import { getAIProvider } from "../src/lib/ai";

const QUESTIONS_INPUT = {
  title: "OpenRouter smoke test",
  meetingType: "small" as const,
  audience: "Engineering",
  stakes: "Low",
  desiredOutcome: "Verify API",
  context: "",
};

const BRIEF_INPUT = {
  ...QUESTIONS_INPUT,
  questions: [
    { q: "What is the goal?", answer: "To verify the API works." },
    { q: "Who decides?", answer: "The tester." },
    { q: "What could go wrong?", answer: "Nothing critical." },
  ],
};

async function main() {
  if (process.env.AI_PROVIDER !== "openrouter") {
    console.error("Set AI_PROVIDER=openrouter and OPENROUTER_API_KEY in .env.local");
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is required");
    process.exit(1);
  }

  const ai = getAIProvider();
  console.log("Provider:", process.env.AI_PROVIDER);
  if (process.env.OPENROUTER_MODEL_1) {
    const models = [process.env.OPENROUTER_MODEL_1, process.env.OPENROUTER_MODEL_2, process.env.OPENROUTER_MODEL_3]
      .filter(Boolean)
      .map((m) => m!.trim())
      .slice(0, 3);
    console.log("Model overrides:", models);
  }
  console.log("");

  console.log("1. generateQuestions...");
  const qResult = await ai.generateQuestions(QUESTIONS_INPUT);
  if (!qResult.ok) {
    console.error("generateQuestions failed:", qResult.error);
    process.exit(1);
  }
  if ("_raw" in qResult.data) {
    console.log("   (raw fallback):", qResult.data.text.slice(0, 120) + "...");
  } else {
    console.log("   questions:", qResult.data.questions);
  }
  console.log("");

  console.log("2. generateBrief...");
  const bResult = await ai.generateBrief(BRIEF_INPUT);
  if (!bResult.ok) {
    console.error("generateBrief failed:", bResult.error);
    process.exit(1);
  }
  if ("_raw" in bResult.data) {
    const text = bResult.data.text;
    console.log("   (freeform, length %d):", text.length);
    console.log("   ---");
    console.log(text.slice(0, 400) + (text.length > 400 ? "..." : ""));
  } else {
    console.log("   (legacy structured):", Object.keys(bResult.data));
  }
  console.log("");
  console.log("OpenRouter smoke test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
