import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { sanitizeText, ValidationError } from "@/lib/sanitize";
import type { QuestionEntry } from "@/lib/db/schema";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (!Array.isArray(body.answers) || body.answers.length !== 3) {
      return NextResponse.json(
        { message: "answers must be an array of exactly 3 entries" },
        { status: 400 }
      );
    }

    const answers = body.answers as Array<{
      question: string;
      editedQuestion?: string;
      answer: string;
    }>;

    const db = getDb();

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

    const questions: QuestionEntry[] = answers.map((a) => ({
      q: sanitizeText(a.question, "question"),
      editedQ: a.editedQuestion
        ? sanitizeText(a.editedQuestion, "editedQuestion")
        : undefined,
      answer: sanitizeText(a.answer, "answer"),
    }));

    await db
      .update(schema.frames)
      .set({ questions })
      .where(eq(schema.frames.token, token));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("PUT /api/frame/[token]/answers error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
