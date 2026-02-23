/**
 * Smoke test for the OpenRouter free-tier adapter.
 * Calls all three AI methods directly — no database required.
 *
 * Usage:
 *   npx tsx scripts/smoke-openrouter.ts
 *
 * Requires OPENROUTER_API_KEY in .env.local (already set).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { OpenRouterAdapter } from "../src/lib/ai/openrouter-adapter";
import { isRawFallback } from "../src/lib/ai";

const config = {
  apiKey: process.env.OPENROUTER_API_KEY!,
  siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://frame-mirror.app",
  siteName: process.env.OPENROUTER_SITE_NAME ?? "Frame + Mirror",
};

if (!config.apiKey) {
  console.error("ERROR: OPENROUTER_API_KEY not set in environment");
  process.exit(1);
}

const adapter = new OpenRouterAdapter(config);

async function run() {
  console.log("=== OpenRouter Free-Tier Smoke Test ===\n");

  // 1. generateQuestions
  console.log("[1/3] generateQuestions...");
  const t1 = Date.now();
  const qResult = await adapter.generateQuestions({
    title: "Q3 Budget Review",
    meetingType: "small",
    audience: "Finance team and department heads",
    stakes: "Approve or reject the proposed 15% budget increase",
    desiredOutcome: "Clear decision on budget allocation with assigned owners",
    context: "Last quarter we overspent by 8%. CFO is skeptical.",
  });
  console.log(`   Done in ${Date.now() - t1}ms`);
  if (qResult.ok) {
    if (isRawFallback(qResult.data)) {
      console.log("   OK (raw):", qResult.data.text.slice(0, 200) + (qResult.data.text.length > 200 ? "…" : ""));
    } else {
      console.log("   OK:", qResult.data.questions);
    }
  } else {
    console.error("   FAIL:", qResult.error);
  }

  // 2. generateBrief
  console.log("\n[2/3] generateBrief...");
  const t2 = Date.now();
  const bResult = await adapter.generateBrief({
    title: "Q3 Budget Review",
    meetingType: "small",
    audience: "Finance team and department heads",
    stakes: "Approve or reject the proposed 15% budget increase",
    desiredOutcome: "Clear decision on budget allocation with assigned owners",
    context: "Last quarter we overspent by 8%. CFO is skeptical.",
    questions: [
      { q: "What caused the 8% overspend?", answer: "Unplanned contractor costs in engineering" },
      { q: "Has the CFO seen the revised projections?", answer: "Not yet, we're presenting them in this meeting" },
      { q: "Who has final sign-off authority?", answer: "CFO, but VP Eng has veto on technical line items" },
    ],
  });
  console.log(`   Done in ${Date.now() - t2}ms`);
  if (bResult.ok) {
    if (isRawFallback(bResult.data)) {
      console.log("   OK (raw):", bResult.data.text.slice(0, 200) + (bResult.data.text.length > 200 ? "…" : ""));
    } else {
      console.log("   OK:", JSON.stringify(bResult.data, null, 2));
    }
  } else {
    console.error("   FAIL:", bResult.error);
  }

  // 3. generateOverlay
  console.log("\n[3/3] generateOverlay...");
  const t3 = Date.now();
  const oResult = await adapter.generateOverlay({
    intent: "Convince the team to adopt the new CI/CD pipeline",
    keyMessage: "The new pipeline reduces deploy time from 45 min to 8 min",
    desiredAction: "Team agrees to migrate within 2 sprints",
    responses: [
      { understood: "Deploy time will improve", unclear: "What happens to our existing scripts", concerns: "Migration effort during feature freeze" },
      { understood: "Faster deploys", unclear: "Who maintains the new pipeline", concerns: "Reliability of the new system" },
      { understood: "Speed improvement is significant", unclear: "Rollback process", concerns: "Learning curve for junior devs" },
    ],
  });
  console.log(`   Done in ${Date.now() - t3}ms`);
  if (oResult.ok) {
    if (isRawFallback(oResult.data)) {
      console.log("   OK (raw):", oResult.data.text.slice(0, 200) + (oResult.data.text.length > 200 ? "…" : ""));
    } else {
      console.log("   OK:", JSON.stringify(oResult.data, null, 2));
    }
  } else {
    console.error("   FAIL:", oResult.error);
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`  generateQuestions: ${qResult.ok ? "PASS" : "FAIL"}`);
  console.log(`  generateBrief:    ${bResult.ok ? "PASS" : "FAIL"}`);
  console.log(`  generateOverlay:  ${oResult.ok ? "PASS" : "FAIL"}`);

  const allPassed = qResult.ok && bResult.ok && oResult.ok;
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
