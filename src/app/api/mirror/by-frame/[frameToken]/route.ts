import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ frameToken: string }> }
) {
  const { frameToken } = await params;
  const db = getDb();

  const sessions = await db
    .select({ mtoken: schema.mirrorSessions.mtoken })
    .from(schema.mirrorSessions)
    .where(
      and(
        eq(schema.mirrorSessions.frameToken, frameToken),
        gt(schema.mirrorSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessions.length) {
    return NextResponse.json({ mtoken: null });
  }

  return NextResponse.json({ mtoken: sessions[0].mtoken });
}
