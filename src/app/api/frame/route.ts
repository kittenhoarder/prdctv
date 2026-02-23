import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { generateToken, getExpiresAt } from "@/lib/tokens";
import { sanitizeText, sanitizeOptionalText, ValidationError } from "@/lib/sanitize";
import { log } from "@/lib/logger";

const VALID_TYPES = new Set(["small", "presentation"]);
const VALID_STAKES = new Set(["low", "medium", "high", "critical"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  try {
    const type = sanitizeText(body.type, "type");
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { message: "type must be 'small' or 'presentation'" },
        { status: 400 }
      );
    }

    const stakes = sanitizeText(body.stakes, "stakes");
    if (!VALID_STAKES.has(stakes)) {
      return NextResponse.json(
        { message: "stakes must be one of: low, medium, high, critical" },
        { status: 400 }
      );
    }

    const title = sanitizeText(body.title, "title");
    const audience = sanitizeText(body.audience, "audience");
    const outcome = sanitizeText(body.outcome, "outcome");
    const context = sanitizeOptionalText(body.context, "context");

    const db = getDb();
    let token = generateToken();

    // Collision avoidance: retry once on PRIMARY KEY conflict (astronomically rare)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await db.insert(schema.frames).values({
          token,
          type: type as "small" | "presentation",
          title,
          audience,
          stakes: stakes as "low" | "medium" | "high" | "critical",
          outcome,
          context,
          expiresAt: getExpiresAt(),
        });
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === 0 && msg.includes("unique") || msg.includes("duplicate")) {
          token = generateToken();
          continue;
        }
        throw err;
      }
    }

    log({ event: "frame.created", token, type, stakes });

    return NextResponse.json({ token, type }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("POST /api/frame error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
