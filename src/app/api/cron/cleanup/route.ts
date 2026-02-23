import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { lt } from "drizzle-orm";

/** Daily cleanup cron — invoked by Vercel Cron at 03:00 UTC. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  // Cascade deletes handle mirror_sessions and mirror_responses
  const result = await db
    .delete(schema.frames)
    .where(lt(schema.frames.expiresAt, now));

  console.log(
    JSON.stringify({
      ts: now.toISOString(),
      event: "cron.cleanup",
      rowsDeleted: (result as { rowCount?: number }).rowCount ?? "unknown",
    })
  );

  return NextResponse.json({ ok: true });
}
