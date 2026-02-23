/** Trim and strip HTML from a string. Use before Zod validation on all string inputs. */
export function sanitizeForValidation(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

/** Recursively sanitize all string values in an object (for request bodies). Use before Zod parse. */
export function sanitizeStrings<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeForValidation(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeStrings(item)) as T;
  }
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = sanitizeStrings(v);
    }
    return out as T;
  }
  return obj;
}

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /disregard\s+(the\s+)?above/i,
];

const MAX_FIELD_LENGTH = 2000;

/** Strips HTML tags, trims, enforces max length, rejects injection attempts. */
export function sanitizeText(value: unknown, fieldName = "field"): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  // Strip HTML
  const stripped = value.replace(/<[^>]*>/g, "").trim();

  if (stripped.length > MAX_FIELD_LENGTH) {
    throw new ValidationError(
      `${fieldName} exceeds maximum length of ${MAX_FIELD_LENGTH} characters`
    );
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(stripped)) {
      throw new ValidationError(`${fieldName} contains disallowed content`);
    }
  }

  return stripped;
}

/** Sanitize an optional text field (returns undefined if empty/missing). */
export function sanitizeOptionalText(
  value: unknown,
  fieldName = "field"
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return sanitizeText(value, fieldName);
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
