/**
 * Debug: call OpenRouter with same shape as adapter and log raw response.
 * Run: npx tsx scripts/debug-openrouter-response.ts
 */
import dotenv from "dotenv";
import { modelSelector } from "../src/lib/ai/openrouter/model-selector";

dotenv.config({ path: ".env.local" });

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY required");
    process.exit(1);
  }

  // Same logic as adapter: overrides if OPENROUTER_MODEL_1 set, else selector
  let models: string[];
  const o1 = process.env.OPENROUTER_MODEL_1;
  if (o1?.trim()) {
    models = [process.env.OPENROUTER_MODEL_1!, process.env.OPENROUTER_MODEL_2!, process.env.OPENROUTER_MODEL_3!]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .slice(0, 3);
    console.log("Using override models:", models);
  } else {
    models = await modelSelector.getAvailableModels(3);
    console.log("Selected models (selector):", models);
  }
  if (models.length === 0) {
    console.error("No models available (e.g. all unhealthy or discovery failed)");
    process.exit(1);
  }

  const system =
    "You are a meeting preparation expert. Return JSON only: {\"questions\": [\"Q1?\", \"Q2?\", \"Q3?\"]}. No explanation.";
  const user = "<user_input>\nMeeting: Test. Type: small. Audience: Dev. Stakes: Low. Desired outcome: Verify API.\n</user_input>";

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://frame-mirror.app",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Frame + Mirror",
    },
    body: JSON.stringify({
      models,
      messages: [{ role: "user", content: system }, { role: "user", content: user }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const body = await res.json();
  console.log("Status:", res.status);
  console.log("Response model:", body.model);
  console.log("Choices length:", body.choices?.length ?? 0);
  if (body.choices?.[0]) {
    const c = body.choices[0];
    console.log("First choice finish_reason:", c.finish_reason);
    console.log("First choice message keys:", c.message ? Object.keys(c.message) : "none");
    console.log("Content length:", typeof c.message?.content === "string" ? c.message.content.length : 0);
    if (c.message?.content) console.log("Content preview:", (c.message.content as string).slice(0, 200));
  }
  if (body.error) console.log("Error:", body.error);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
