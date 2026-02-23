-- Mirror standalone sessions: frame_token optional (null = Mirror-only, no Frame).
ALTER TABLE "mirror_sessions" ALTER COLUMN "frame_token" DROP NOT NULL;
