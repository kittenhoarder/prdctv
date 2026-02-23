import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { generateToken, getExpiresAt } from "@/lib/tokens";
import { sanitizeText, ValidationError } from "@/lib/sanitize";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const mirrorEnabled = process.env.ENABLE_MIRROR !== "false";
  if (!mirrorEnabled) {
    return NextResponse.json({ message: "Mirror is not enabled" }, { status: 403 });
  }

  try {
    const frameToken = sanitizeText(body.frameToken, "frameToken");
    const intent = sanitizeText(body.intent, "intent");
    const keyMessage = sanitizeText(body.keyMessage, "keyMessage");
    const desiredAction = sanitizeText(body.desiredAction, "desiredAction");

    const db = getDb();

    // Verify frame exists and isn't expired
    const frames = await db
      .select({ token: schema.frames.token })
      .from(schema.frames)
      .where(
        and(
          eq(schema.frames.token, frameToken),
          gt(schema.frames.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!frames.length) {
      return NextResponse.json(
        { message: "Frame not found or expired" },
        { status: 404 }
      );
    }

    const mtoken = generateToken();

    await db.insert(schema.mirrorSessions).values({
      mtoken,
      frameToken,
      intent,
      keyMessage,
      desiredAction,
      expiresAt: getExpiresAt(),
    });

    log({ event: "mirror.created", mtoken, frameToken });

    return NextResponse.json({ mtoken }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("POST /api/mirror error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
