/**
 * Export product feedback from the database to JSON.
 * Loads DATABASE_URL from .env.local.
 *
 * Usage:
 *   npx tsx scripts/export-feedback.ts           # stdout
 *   npx tsx scripts/export-feedback.ts > out.json
 *   npm run feedback:export
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { getDb, schema } from "../src/lib/db";
import { desc } from "drizzle-orm";

async function main() {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.feedback)
    .orderBy(desc(schema.feedback.createdAt));

  const out = rows.map((r) => ({
    id: r.id,
    message: r.message,
    kind: r.kind ?? undefined,
    source: r.source ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));

  process.stdout.write(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
