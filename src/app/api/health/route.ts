import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const aiProvider =
    process.env.ENABLE_AI === "false" || process.env.AI_PROVIDER === "mock"
      ? "mock"
      : "openrouter";

  const payload: {
    status: "ok" | "degraded";
    timestamp: string;
    ai_provider: "mock" | "openrouter";
    db?: "ok" | "error";
  } = {
    status: "ok",
    timestamp,
    ai_provider: aiProvider,
  };

  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      payload.db = "ok";
    } catch {
      payload.db = "error";
      payload.status = "degraded";
    }
  }

  return NextResponse.json(payload);
}
