import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { log } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.frames)
    .where(
      and(
        eq(schema.frames.token, token),
        gt(schema.frames.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!rows.length) {
    // Check if it exists but expired
    const expired = await db
      .select({ token: schema.frames.token })
      .from(schema.frames)
      .where(eq(schema.frames.token, token))
      .limit(1);

    if (expired.length) {
      log({ event: "token.expired_access", token, route: "/api/frame/[token]" });
      return NextResponse.json({ message: "This brief has expired" }, { status: 410 });
    }

    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const frame = rows[0];
  return NextResponse.json({
    token: frame.token,
    type: frame.type,
    title: frame.title,
    audience: frame.audience,
    stakes: frame.stakes,
    outcome: frame.outcome,
    context: frame.context,
    questions: frame.questions,
    brief: frame.brief,
    createdAt: frame.createdAt,
    expiresAt: frame.expiresAt,
  });
}
