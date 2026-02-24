import { timingSafeEqual, createHash } from "crypto";
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

/** TTL for overlay access codes: 30 days from now. */
export function getOverlayCodeExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
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

const WORD_LIST_ONE = [
  "brave",
  "calm",
  "bright",
  "clear",
  "steady",
  "honest",
  "quiet",
  "warm",
  "sharp",
  "soft",
];

const WORD_LIST_TWO = [
  "fox",
  "river",
  "signal",
  "compass",
  "bridge",
  "lantern",
  "anchor",
  "echo",
  "harbor",
  "needle",
];

const WORD_LIST_THREE = [
  "listens",
  "lands",
  "remembers",
  "aligns",
  "responds",
  "reflects",
  "settles",
  "clarifies",
  "connects",
  "stays",
];

function pickWord(words: string[]): string {
  const idx = Math.floor(Math.random() * words.length);
  return words[idx]!;
}

/** Generate a three-word, hyphenated overlay access code (e.g. brave-fox-listens). */
export function generateOverlayCode(): string {
  return [
    pickWord(WORD_LIST_ONE),
    pickWord(WORD_LIST_TWO),
    pickWord(WORD_LIST_THREE),
  ].join("-");
}

/** Normalize user-entered overlay code input into our canonical hyphenated form. */
export function normalizeOverlayCode(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  // Collapse any whitespace or repeated hyphens into single hyphens.
  const replaced = trimmed.replace(/[\s_-]+/g, "-");
  // Guard against leading/trailing hyphens after normalization.
  return replaced.replace(/^-+/, "").replace(/-+$/, "");
}

/** Hash overlay codes so we never store them in plaintext in the database. */
export function hashOverlayCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

/** Timing-safe comparison for fixed-length hash strings. */
export function timingSafeEqualHash(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}
