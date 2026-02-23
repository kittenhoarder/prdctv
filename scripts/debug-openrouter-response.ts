/**
 * One-off: call OpenRouter and print the raw response content.
 * Usage: npx tsx scripts/debug-openrouter-response.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("OPENROUTER_API_KEY not set");
  process.exit(1);
}

async function run() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://frame-mirror.app",
      "X-Title": "Frame + Mirror",
    },
    body: JSON.stringify({
      models: [
        "meta-llama/llama-3.2-3b-instruct:free",
        "google/gemma-2-9b-it:free",
      ],
      messages: [
        {
          role: "user",
          content:
            "You are a meeting preparation expert. Return JSON only: {\"questions\": [\"Q1?\", \"Q2?\", \"Q3?\"]}. Do not add any other text.",
        },
        {
          role: "user",
          content: "Meeting: Budget review. Audience: Finance team.",
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Model used:", json.model);
  console.log("Raw content (first 1500 chars):");
  console.log("---");
  const content = json.choices?.[0]?.message?.content ?? json;
  console.log(typeof content === "string" ? content.slice(0, 1500) : JSON.stringify(content).slice(0, 1500));
  console.log("---");
  if (json.error) console.log("API error:", json.error);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
