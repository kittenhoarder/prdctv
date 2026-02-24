import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai";
import { log } from "@/lib/logger";
import {
  hashOverlayCode,
  normalizeOverlayCode,
  timingSafeDummyCompare,
  timingSafeEqualHash,
  timingSafeEqualToken,
} from "@/lib/tokens";
import { tokenParamSchema } from "@/lib/validation/schemas";

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
  const db = getDb();
  const start = Date.now();

  const sessions = await db
    .select()
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
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }
  if (!timingSafeEqualToken(validMtoken, sessions[0].mtoken)) {
    return NextResponse.json({ message: "Not found or expired" }, { status: 404 });
  }

  const session = sessions[0];
  const inputCode =
    req.nextUrl.searchParams.get("code") ??
    req.headers.get("x-overlay-code") ??
    "";
  const normalizedCode = normalizeOverlayCode(inputCode);

  if (!session.overlayCodeHash || !session.overlayCodeExpiresAt) {
    return NextResponse.json(
      { message: "Overlay access code is not configured for this session" },
      { status: 403 }
    );
  }

  if (session.overlayCodeExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { message: "Overlay access code has expired" },
      { status: 403 }
    );
  }

  if (!normalizedCode) {
    return NextResponse.json(
      { message: "Overlay access code required" },
      { status: 401 }
    );
  }

  const providedHash = hashOverlayCode(normalizedCode);
  if (!timingSafeEqualHash(providedHash, session.overlayCodeHash)) {
    return NextResponse.json(
      { message: "Invalid overlay access code" },
      { status: 401 }
    );
  }

  const responses = await db
    .select()
    .from(schema.mirrorResponses)
    .where(eq(schema.mirrorResponses.mtoken, validMtoken));

  if (responses.length === 0) {
    return NextResponse.json(
      { message: "At least 1 audience response is required to generate the overlay" },
      { status: 400 }
    );
  }

  const ai = getAIProvider();
  const result = await ai.generateOverlay({
    intent: session.intent,
    keyMessage: session.keyMessage,
    desiredAction: session.desiredAction,
    responses: responses.map((r) => ({
      understood: r.understood,
      unclear: r.unclear,
      concerns: r.concerns,
    })),
  });

  if (!result.ok) {
    log({
      event: "ai.call.failure",
      function: "generateOverlay",
      errorType: result.error.code,
      sessionHash: validMtoken.slice(0, 8),
    });
    return NextResponse.json(
      { message: "Unable to generate. Please try again." },
      { status: 503 }
    );
  }

  await db
    .update(schema.mirrorSessions)
    .set({ overlay: result.data })
    .where(eq(schema.mirrorSessions.mtoken, validMtoken));

  log({
    event: "ai.call.success",
    function: "generateOverlay",
    latencyMs: Date.now() - start,
    sessionHash: validMtoken.slice(0, 8),
    responseCount: responses.length,
  });

  return NextResponse.json({ overlay: result.data });
}
