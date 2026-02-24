import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { parseRequestBody } from "@/lib/validation/parse";
import { feedbackBodySchema } from "@/lib/validation/schemas";
import { nanoid } from "nanoid";

/** POST /api/feedback — store product feedback; no PII logged. */
export async function POST(req: NextRequest) {
  const parsed = await parseRequestBody(req, feedbackBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const { message, kind, source } = parsed.data;

  const id = nanoid(12);
  const db = getDb();
  await db.insert(schema.feedback).values({
    id,
    message,
    kind: kind ?? null,
    source: source ?? null,
  });

  return NextResponse.json({ id }, { status: 201 });
}
