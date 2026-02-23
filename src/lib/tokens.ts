import { nanoid } from "nanoid";

/** Generates a 21-char URL-safe token (~126 bits entropy). */
export function generateToken(): string {
  return nanoid(21);
}

/** TTL for all sessions: 7 days from now. */
export function getExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
