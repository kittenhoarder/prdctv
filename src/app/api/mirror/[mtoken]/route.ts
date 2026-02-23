import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt, count } from "drizzle-orm";
import { log } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mtoken: string }> }
) {
  const { mtoken } = await params;
  const db = getDb();

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
    const expired = await db
      .select({ mtoken: schema.mirrorSessions.mtoken })
      .from(schema.mirrorSessions)
      .where(eq(schema.mirrorSessions.mtoken, mtoken))
      .limit(1);

    if (expired.length) {
      log({ event: "token.expired_access", token: mtoken, route: "/api/mirror/[mtoken]" });
      return NextResponse.json({ message: "This session has expired" }, { status: 410 });
    }

    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const session = sessions[0];

  const [responseCountResult] = await db
    .select({ count: count() })
    .from(schema.mirrorResponses)
    .where(eq(schema.mirrorResponses.mtoken, mtoken));

  return NextResponse.json({
    mtoken: session.mtoken,
    frameToken: session.frameToken,
    intent: session.intent,
    keyMessage: session.keyMessage,
    desiredAction: session.desiredAction,
    overlay: session.overlay,
    responseCount: responseCountResult?.count ?? 0,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  });
}
