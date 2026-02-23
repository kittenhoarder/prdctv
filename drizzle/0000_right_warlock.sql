CREATE TABLE "frames" (
	"token" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"stakes" text NOT NULL,
	"outcome" text NOT NULL,
	"context" text,
	"questions" jsonb,
	"brief" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mirror_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"mtoken" text NOT NULL,
	"understood" text NOT NULL,
	"unclear" text NOT NULL,
	"concerns" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mirror_sessions" (
	"mtoken" text PRIMARY KEY NOT NULL,
	"frame_token" text NOT NULL,
	"intent" text NOT NULL,
	"key_message" text NOT NULL,
	"desired_action" text NOT NULL,
	"overlay" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mirror_responses" ADD CONSTRAINT "mirror_responses_mtoken_mirror_sessions_mtoken_fk" FOREIGN KEY ("mtoken") REFERENCES "public"."mirror_sessions"("mtoken") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mirror_sessions" ADD CONSTRAINT "mirror_sessions_frame_token_frames_token_fk" FOREIGN KEY ("frame_token") REFERENCES "public"."frames"("token") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_frames_expires" ON "frames" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_responses_mtoken" ON "mirror_responses" USING btree ("mtoken");--> statement-breakpoint
CREATE INDEX "idx_mirror_frame" ON "mirror_sessions" USING btree ("frame_token");--> statement-breakpoint
CREATE INDEX "idx_mirror_expires" ON "mirror_sessions" USING btree ("expires_at");