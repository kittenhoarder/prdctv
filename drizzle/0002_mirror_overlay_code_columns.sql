ALTER TABLE "mirror_sessions" ADD COLUMN IF NOT EXISTS "overlay_code_hash" text;
ALTER TABLE "mirror_sessions" ADD COLUMN IF NOT EXISTS "overlay_code_expires_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "idx_mirror_overlay_code_expires" ON "mirror_sessions" USING btree ("overlay_code_expires_at");
