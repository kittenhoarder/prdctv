import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import { log } from "@/lib/logger";
import type { FrameBrief } from "@/lib/db/schema";

const SYSTEM_PROMPT = `You are a strategic communication advisor. Given meeting context and 3 answered clarifying questions, produce a concise Frame Brief. The brief should be direct and actionable — no hedging, no filler. The 'realGoal' may differ from the stated outcome if the answers reveal a deeper objective. The 'openingReadout' must be speakable in ~30 seconds. Do not infer PII or make psychological assessments about individuals. Return JSON only matching this schema: {"realGoal":"string","constraint":"string","mustAgree":"string","badOutcome":"string","agenda":"string","openingReadout":"string"}`;

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    realGoal: { type: "string" },
    constraint: { type: "string" },
    mustAgree: { type: "string" },
    badOutcome: { type: "string" },
    agenda: { type: "string" },
    openingReadout: { type: "string" },
  },
  required: ["realGoal", "constraint", "mustAgree", "badOutcome", "agenda", "openingReadout"],
  additionalProperties: false,
};

const REQUIRED_BRIEF_KEYS: Array<keyof FrameBrief> = [
  "realGoal",
  "constraint",
  "mustAgree",
  "badOutcome",
  "agenda",
  "openingReadout",
];

function isValidBrief(obj: unknown): obj is FrameBrief {
  if (!obj || typeof obj !== "object") return false;
  return REQUIRED_BRIEF_KEYS.every(
    (k) => typeof (obj as Record<string, unknown>)[k] === "string"
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();
  const start = Date.now();

  const rows = await db
    .select()
    .from(schema.frames)
    .where(
      and(eq(schema.frames.token, token), gt(schema.frames.expiresAt, new Date()))
    )
    .limit(1);

  if (!rows.length) {
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }

  const frame = rows[0];

  if (!frame.questions?.length) {
    return NextResponse.json(
      { message: "Questions must be answered before generating a brief" },
      { status: 400 }
    );
  }

  const qaText = frame.questions
    .map((q, i) => `Q${i + 1}: ${q.editedQ ?? q.q}\nA${i + 1}: ${q.answer ?? "(no answer)"}`)
    .join("\n");

  const userPrompt = `Meeting: ${frame.title}. Type: ${frame.type}. Audience: ${frame.audience}. Stakes: ${frame.stakes}. Desired outcome: ${frame.outcome}.${frame.context ? ` Context: ${frame.context}` : ""}\n\nQ&A:\n${qaText}`;

  const ai = getAIProvider();
  let brief: FrameBrief | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.generate<FrameBrief>({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        maxTokens: 1000,
        responseSchema: BRIEF_SCHEMA,
      });

      if (!isValidBrief(res.data)) {
        throw new Error("Invalid brief shape from AI");
      }

      brief = res.data;
      break;
    } catch (err) {
      if (attempt === 1) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log({ event: "ai.error", function: "generate-brief", error: errMsg, token });
        return NextResponse.json(
          { message: "Unable to generate. Please try again." },
          { status: 503 }
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await db
    .update(schema.frames)
    .set({ brief })
    .where(eq(schema.frames.token, token));

  log({ event: "frame.brief_generated", token, durationMs: Date.now() - start });

  return NextResponse.json({ brief });
}
