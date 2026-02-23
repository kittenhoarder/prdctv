import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider, isRawFallback } from "@/lib/ai";
import { log } from "@/lib/logger";
import { timingSafeDummyCompare, timingSafeEqualToken } from "@/lib/tokens";
import { tokenParamSchema } from "@/lib/validation/schemas";
import type { QuestionEntry } from "@/lib/db/schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenResult = tokenParamSchema.safeParse(token);
  if (!tokenResult.success) {
    return NextResponse.json({ message: "Invalid token" }, { status: 400 });
  }
  const validToken = tokenResult.data;
  const db = getDb();
  const start = Date.now();

  const rows = await db
    .select()
    .from(schema.frames)
    .where(
      and(eq(schema.frames.token, validToken), gt(schema.frames.expiresAt, new Date()))
    )
    .limit(1);

  if (!rows.length) {
    timingSafeDummyCompare(validToken);
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }
  if (!timingSafeEqualToken(validToken, rows[0].token)) {
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }
  const frame = rows[0];
  const ai = getAIProvider();

  const result = await ai.generateQuestions({
    title: frame.title,
    meetingType: frame.type,
    audience: frame.audience,
    stakes: frame.stakes,
    desiredOutcome: frame.outcome,
    context: frame.context ?? "",
  });

  if (!result.ok) {
    log({
      event: "ai.call.failure",
      function: "generateQuestions",
      errorType: result.error.code,
      sessionHash: validToken.slice(0, 8),
    });
    return NextResponse.json(
      { message: "Unable to generate. Please try again." },
      { status: 503 }
    );
  }

  let questions: QuestionEntry[];
  let responseQuestions: string[] | QuestionEntry[];

  if (isRawFallback(result.data)) {
    questions = [{ q: result.data.text, _raw: true }];
    responseQuestions = questions;
  } else {
    questions = result.data.questions.map((q) => ({ q }));
    responseQuestions = result.data.questions;
  }

  await db
    .update(schema.frames)
    .set({ questions })
    .where(eq(schema.frames.token, validToken));

  log({
    event: "ai.call.success",
    function: "generateQuestions",
    latencyMs: Date.now() - start,
    sessionHash: validToken.slice(0, 8),
  });

  return NextResponse.json({ questions: responseQuestions });
}
