import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import { log } from "@/lib/logger";
import type { QuestionEntry } from "@/lib/db/schema";

const SYSTEM_PROMPT = `You are a meeting preparation expert. Given structured context about an upcoming meeting, generate exactly 3 clarifying questions that would most improve the communicator's preparation. Questions should surface hidden assumptions, unspoken constraints, or political dynamics. Do not infer PII or make psychological assessments. Return JSON only matching this schema: {"questions": ["string","string","string"]}`;

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
  const ai = getAIProvider();

  const userPrompt = `Meeting: ${frame.title}. Type: ${frame.type}. Audience: ${frame.audience}. Stakes: ${frame.stakes}. Desired outcome: ${frame.outcome}.${frame.context ? ` Context: ${frame.context}` : ""}`;

  let result: { questions: string[] };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.generate<{ questions: string[] }>({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 500,
        responseSchema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["questions"],
        },
      });

      // Validate response shape
      if (
        !Array.isArray(res.data.questions) ||
        res.data.questions.length !== 3 ||
        !res.data.questions.every((q) => typeof q === "string" && q.trim())
      ) {
        throw new Error("Invalid questions shape from AI");
      }

      result = res.data;
      break;
    } catch (err) {
      if (attempt === 1) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log({ event: "ai.error", function: "generate-questions", error: errMsg, token });
        return NextResponse.json(
          { message: "Unable to generate. Please try again." },
          { status: 503 }
        );
      }
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const questions: QuestionEntry[] = result!.questions.map((q) => ({ q }));

  await db
    .update(schema.frames)
    .set({ questions })
    .where(eq(schema.frames.token, token));

  log({ event: "frame.questions_generated", token, durationMs: Date.now() - start });

  return NextResponse.json({ questions: result!.questions });
}
