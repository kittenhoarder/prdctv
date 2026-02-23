import { timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";

const TOKEN_LENGTH = 21;

/** Generates a 21-char URL-safe token (~126 bits entropy). */
export function generateToken(): string {
  return nanoid(TOKEN_LENGTH);
}

/** TTL for all sessions: 7 days from now. */
export function getExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

const DUMMY_TOKEN = "0".repeat(TOKEN_LENGTH);

/** Timing-safe comparison for link tokens. Use after DB lookup to avoid leaking existence by response time. */
export function timingSafeEqualToken(a: string, b: string): boolean {
  if (a.length !== TOKEN_LENGTH || b.length !== TOKEN_LENGTH) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Call after failed lookup so response time doesn't leak existence. */
export function timingSafeDummyCompare(token: string): void {
  timingSafeEqualToken(token, DUMMY_TOKEN);
}
