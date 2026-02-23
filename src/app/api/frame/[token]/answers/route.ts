import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { timingSafeDummyCompare, timingSafeEqualToken } from "@/lib/tokens";
import { parseRequestBody } from "@/lib/validation/parse";
import { answerQuestionsBodySchema, tokenParamSchema } from "@/lib/validation/schemas";
import type { QuestionEntry } from "@/lib/db/schema";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const tokenResult = tokenParamSchema.safeParse(token);
  if (!tokenResult.success) {
    return NextResponse.json({ message: "Invalid token" }, { status: 400 });
  }
  const validToken = tokenResult.data;

  const parsed = await parseRequestBody(req, answerQuestionsBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const questions: QuestionEntry[] = parsed.data.answers.map((a) => ({
    q: a.question,
    editedQ: a.editedQuestion,
    answer: a.answer,
  }));

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.frames)
    .where(
      and(
        eq(schema.frames.token, validToken),
        gt(schema.frames.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!rows.length) {
    timingSafeDummyCompare(validToken);
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }
  if (!timingSafeEqualToken(validToken, rows[0].token)) {
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }

  await db
    .update(schema.frames)
    .set({ questions })
    .where(eq(schema.frames.token, validToken));

  return NextResponse.json({ ok: true });
}
