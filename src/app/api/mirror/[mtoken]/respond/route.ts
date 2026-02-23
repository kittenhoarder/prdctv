import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt, count } from "drizzle-orm";
import { sanitizeText, ValidationError } from "@/lib/sanitize";
import { log } from "@/lib/logger";
import { nanoid } from "nanoid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mtoken: string }> }
) {
  const { mtoken } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const understood = sanitizeText(body.understood, "understood");
    const unclear = sanitizeText(body.unclear, "unclear");
    const concerns = sanitizeText(body.concerns, "concerns");

    const db = getDb();

    const sessions = await db
      .select({ mtoken: schema.mirrorSessions.mtoken })
      .from(schema.mirrorSessions)
      .where(
        and(
          eq(schema.mirrorSessions.mtoken, mtoken),
          gt(schema.mirrorSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!sessions.length) {
      return NextResponse.json(
        { message: "Session not found or expired" },
        { status: 404 }
      );
    }

    await db.insert(schema.mirrorResponses).values({
      id: nanoid(21),
      mtoken,
      understood,
      unclear,
      concerns,
    });

    // Get updated response count for logging
    const [countResult] = await db
      .select({ count: count() })
      .from(schema.mirrorResponses)
      .where(eq(schema.mirrorResponses.mtoken, mtoken));

    log({
      event: "mirror.response_submitted",
      mtoken,
      responseNumber: countResult?.count ?? 1,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("POST /api/mirror/[mtoken]/respond error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
