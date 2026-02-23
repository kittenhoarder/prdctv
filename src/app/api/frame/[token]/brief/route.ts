import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import { log } from "@/lib/logger";
import { timingSafeDummyCompare, timingSafeEqualToken } from "@/lib/tokens";
import { tokenParamSchema } from "@/lib/validation/schemas";

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

  if (!frame.questions?.length) {
    return NextResponse.json(
      { message: "Questions must be answered before generating a brief" },
      { status: 400 }
    );
  }

  const ai = getAIProvider();
  const result = await ai.generateBrief({
    title: frame.title,
    meetingType: frame.type,
    audience: frame.audience,
    stakes: frame.stakes,
    desiredOutcome: frame.outcome,
    context: frame.context ?? "",
    questions: frame.questions.map((q) => ({
      q: q.q,
      editedQ: q.editedQ,
      answer: q.answer,
    })),
  });

  if (!result.ok) {
    log({
      event: "ai.call.failure",
      function: "generateBrief",
      errorType: result.error.code,
      sessionHash: validToken.slice(0, 8),
    });
    return NextResponse.json(
      { message: "Unable to generate. Please try again." },
      { status: 503 }
    );
  }

  await db
    .update(schema.frames)
    .set({ brief: result.data })
    .where(eq(schema.frames.token, validToken));

  log({
    event: "ai.call.success",
    function: "generateBrief",
    latencyMs: Date.now() - start,
    sessionHash: validToken.slice(0, 8),
  });

  return NextResponse.json({ brief: result.data });
}
