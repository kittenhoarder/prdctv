import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import { log } from "@/lib/logger";
import type { MirrorOverlay } from "@/lib/db/schema";

const SYSTEM_PROMPT = `You are a communication gap analyst. Given a communicator's stated intent, key message, and desired audience action alongside aggregated audience responses, identify the top 3 divergences between intent and reception, extract recurring themes with approximate counts, and draft a one-paragraph follow-up message that addresses the gaps. Be specific and constructive — no generic advice. Do not infer PII or make psychological assessments about individuals. Return JSON only matching this schema: {"divergences":[{"intended":"string","received":"string","gapSummary":"string"}],"themes":[{"theme":"string","count":0}],"followUp":"string"}`;

const OVERLAY_SCHEMA = {
  type: "object",
  properties: {
    divergences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          intended: { type: "string" },
          received: { type: "string" },
          gapSummary: { type: "string" },
        },
        required: ["intended", "received", "gapSummary"],
      },
      minItems: 1,
      maxItems: 3,
    },
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          count: { type: "number" },
        },
        required: ["theme", "count"],
      },
    },
    followUp: { type: "string" },
  },
  required: ["divergences", "themes", "followUp"],
  additionalProperties: false,
};

function isValidOverlay(obj: unknown): obj is MirrorOverlay {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as MirrorOverlay;
  return (
    Array.isArray(o.divergences) &&
    o.divergences.length >= 1 &&
    Array.isArray(o.themes) &&
    typeof o.followUp === "string"
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ mtoken: string }> }
) {
  const { mtoken } = await params;
  const db = getDb();
  const start = Date.now();

  const sessions = await db
    .select()
    .from(schema.mirrorSessions)
    .where(
      and(
        eq(schema.mirrorSessions.mtoken, mtoken),
        gt(schema.mirrorSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessions.length) {
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }

  const session = sessions[0];

  const responses = await db
    .select()
    .from(schema.mirrorResponses)
    .where(eq(schema.mirrorResponses.mtoken, mtoken));

  if (responses.length === 0) {
    return NextResponse.json(
      { message: "At least 1 audience response is required to generate the overlay" },
      { status: 400 }
    );
  }

  const responsesText = responses
    .map(
      (r, i) =>
        `Response ${i + 1}:\n  Understood: ${r.understood}\n  Unclear: ${r.unclear}\n  Concerns: ${r.concerns}`
    )
    .join("\n\n");

  const userPrompt = `Intent: ${session.intent}\nKey message: ${session.keyMessage}\nDesired action: ${session.desiredAction}\n\nAudience responses (n=${responses.length}):\n${responsesText}`;

  const ai = getAIProvider();
  let overlay: MirrorOverlay | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.generate<MirrorOverlay>({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        maxTokens: 1200,
        responseSchema: OVERLAY_SCHEMA,
      });

      if (!isValidOverlay(res.data)) {
        throw new Error("Invalid overlay shape from AI");
      }

      overlay = res.data;
      break;
    } catch (err) {
      if (attempt === 1) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log({ event: "ai.error", function: "generate-overlay", error: errMsg, token: mtoken });
        return NextResponse.json(
          { message: "Unable to generate. Please try again." },
          { status: 503 }
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await db
    .update(schema.mirrorSessions)
    .set({ overlay })
    .where(eq(schema.mirrorSessions.mtoken, mtoken));

  log({
    event: "mirror.overlay_generated",
    mtoken,
    responseCount: responses.length,
    durationMs: Date.now() - start,
  });

  return NextResponse.json({ overlay });
}
