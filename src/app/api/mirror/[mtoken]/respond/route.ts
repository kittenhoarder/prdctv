import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt, count } from "drizzle-orm";
import { timingSafeDummyCompare, timingSafeEqualToken } from "@/lib/tokens";
import { parseRequestBody } from "@/lib/validation/parse";
import { mirrorResponseInputSchema, tokenParamSchema } from "@/lib/validation/schemas";
import { log } from "@/lib/logger";
import { nanoid } from "nanoid";

const MAX_RESPONSES_PER_SESSION = 50;
const DEBOUNCE_MS = 2000;
const lastSubmitByMtoken = new Map<string, number>();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mtoken: string }> }
) {
  const { mtoken } = await params;
  const tokenResult = tokenParamSchema.safeParse(mtoken);
  if (!tokenResult.success) {
    return NextResponse.json({ message: "Invalid token" }, { status: 400 });
  }
  const validMtoken = tokenResult.data;

  const parsed = await parseRequestBody(req, mirrorResponseInputSchema);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const { understood, unclear, concerns } = parsed.data;

  const db = getDb();
  const sessions = await db
    .select({ mtoken: schema.mirrorSessions.mtoken })
    .from(schema.mirrorSessions)
    .where(
      and(
        eq(schema.mirrorSessions.mtoken, validMtoken),
        gt(schema.mirrorSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessions.length) {
    timingSafeDummyCompare(validMtoken);
    return NextResponse.json(
      { message: "Session not found or expired" },
      { status: 404 }
    );
  }
  if (!timingSafeEqualToken(validMtoken, sessions[0].mtoken)) {
    return NextResponse.json(
      { message: "Session not found or expired" },
      { status: 404 }
    );
  }

  const now = Date.now();
  const last = lastSubmitByMtoken.get(validMtoken);
  if (last != null && now - last < DEBOUNCE_MS) {
    return NextResponse.json(
      { message: "Please wait before submitting again" },
      { status: 429 }
    );
  }

  const [existingCount] = await db
    .select({ count: count() })
    .from(schema.mirrorResponses)
    .where(eq(schema.mirrorResponses.mtoken, validMtoken));
  if ((existingCount?.count ?? 0) >= MAX_RESPONSES_PER_SESSION) {
    return NextResponse.json(
      { message: "Maximum responses for this session reached" },
      { status: 429 }
    );
  }

  lastSubmitByMtoken.set(validMtoken, now);
  await db.insert(schema.mirrorResponses).values({
    id: nanoid(21),
    mtoken: validMtoken,
    understood,
    unclear,
    concerns,
  });

  const [countResult] = await db
    .select({ count: count() })
    .from(schema.mirrorResponses)
    .where(eq(schema.mirrorResponses.mtoken, validMtoken));

  log({
    event: "mirror.response_submitted",
    mtoken: validMtoken,
    responseNumber: countResult?.count ?? 1,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
