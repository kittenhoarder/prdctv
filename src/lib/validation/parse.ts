import { NextRequest } from "next/server";
import { sanitizeStrings } from "@/lib/sanitize";
import type { z } from "zod";

/**
 * Parse and validate request body: sanitize all strings, then run Zod schema.
 * Use in API route handlers as the single server-side validation gate.
 */
export async function parseRequestBody<T>(
  req: NextRequest,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; message: string }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { success: false, message: "Invalid JSON" };
  }
  const sanitized = sanitizeStrings(raw);
  const result = schema.safeParse(sanitized);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const first = result.error.issues[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
  return { success: false, message };
}
