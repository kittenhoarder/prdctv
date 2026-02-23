import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { generateToken, getExpiresAt } from "@/lib/tokens";
import { parseRequestBody } from "@/lib/validation/parse";
import { createFrameBodySchema } from "@/lib/validation/schemas";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const parsed = await parseRequestBody(req, createFrameBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const { title, meetingType, audience, stakes, desiredOutcome, context } = parsed.data;

  const db = getDb();
  let token = generateToken();

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await db.insert(schema.frames).values({
          token,
          type: meetingType,
          title,
          audience,
          stakes,
          outcome: desiredOutcome,
          context: context || null,
          expiresAt: getExpiresAt(),
        });
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === 0 && (msg.includes("unique") || msg.includes("duplicate"))) {
          token = generateToken();
          continue;
        }
        throw err;
      }
    }

    log({ event: "frame.created", token, type: meetingType, stakes });

    return NextResponse.json({ token, type: meetingType }, { status: 201 });
  } catch (err) {
    console.error("POST /api/frame error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
