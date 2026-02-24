/**
 * Applies the mirror_sessions overlay access code columns migration (0002).
 * Safe to run multiple times via IF NOT EXISTS guards.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/apply-mirror-overlay-code-columns.ts
 *   Or with .env.local: npx tsx scripts/apply-mirror-overlay-code-columns.ts (loads .env.local)
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

  console.log("Applying migration: mirror_sessions overlay code columns …");
  await sql`ALTER TABLE mirror_sessions ADD COLUMN IF NOT EXISTS overlay_code_hash text`;
  await sql`ALTER TABLE mirror_sessions ADD COLUMN IF NOT EXISTS overlay_code_expires_at timestamp with time zone`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mirror_overlay_code_expires ON mirror_sessions (overlay_code_expires_at)`;
  console.log("Done. mirror_sessions now has overlay_code_hash + overlay_code_expires_at and its index.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
