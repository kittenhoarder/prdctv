import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { generateToken, getExpiresAt } from "@/lib/tokens";
import { parseRequestBody } from "@/lib/validation/parse";
import { mirrorIntentInputSchema } from "@/lib/validation/schemas";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_MIRROR === "false") {
    return NextResponse.json({ message: "Mirror is not enabled" }, { status: 403 });
  }

  const parsed = await parseRequestBody(req, mirrorIntentInputSchema);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const { frameToken, intent, keyMessage, desiredAction } = parsed.data;

  const db = getDb();

  if (frameToken != null) {
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
  }

  const mtoken = generateToken();
  await db.insert(schema.mirrorSessions).values({
    mtoken,
    frameToken: frameToken ?? null,
    intent,
    keyMessage,
    desiredAction,
    expiresAt: getExpiresAt(),
  });

  log({ event: "mirror.created", mtoken, frameToken: frameToken ?? undefined });

  return NextResponse.json({ mtoken }, { status: 201 });
}
