/**
 * Applies the mirror_sessions.frame_token nullable migration (0001).
 * Safe to run multiple times: ALTER COLUMN DROP NOT NULL is idempotent in PostgreSQL.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/apply-mirror-frame-nullable.ts
 *   Or with .env.local: npx tsx scripts/apply-mirror-frame-nullable.ts (loads .env.local)
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Set it in .env.local or pass it in the environment.");
  process.exit(1);
}

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(DATABASE_URL!);

  console.log("Applying migration: mirror_sessions.frame_token DROP NOT NULL …");
  await sql`ALTER TABLE mirror_sessions ALTER COLUMN frame_token DROP NOT NULL`;
  console.log("Done. mirror_sessions.frame_token is now nullable (Mirror-only sessions supported).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
