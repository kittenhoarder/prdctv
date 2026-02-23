import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

// ── Frame ─────────────────────────────────────────────────────────────────────

export type StakesLevel = "low" | "medium" | "high" | "critical";
export type FrameType = "small" | "presentation";

export type QuestionEntry = {
  q: string;
  editedQ?: string;
  answer?: string;
};

export type FrameBrief = {
  realGoal: string;
  constraint: string;
  mustAgree: string;
  badOutcome: string;
  agenda: string;
  openingReadout: string;
};

export const frames = pgTable(
  "frames",
  {
    token: text("token").primaryKey(),
    type: text("type").notNull().$type<FrameType>(),
    title: text("title").notNull(),
    audience: text("audience").notNull(),
    stakes: text("stakes").notNull().$type<StakesLevel>(),
    outcome: text("outcome").notNull(),
    context: text("context"),
    questions: jsonb("questions").$type<QuestionEntry[]>(),
    brief: jsonb("brief").$type<FrameBrief>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("idx_frames_expires").on(t.expiresAt)]
);

// ── Mirror ────────────────────────────────────────────────────────────────────

export type MirrorOverlay = {
  divergences: Array<{
    intended: string;
    received: string;
    gapSummary: string;
  }>;
  themes: Array<{ theme: string; count: number }>;
  followUp: string;
};

export const mirrorSessions = pgTable(
  "mirror_sessions",
  {
    mtoken: text("mtoken").primaryKey(),
    frameToken: text("frame_token")
      .notNull()
      .references(() => frames.token, { onDelete: "cascade" }),
    intent: text("intent").notNull(),
    keyMessage: text("key_message").notNull(),
    desiredAction: text("desired_action").notNull(),
    overlay: jsonb("overlay").$type<MirrorOverlay>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("idx_mirror_frame").on(t.frameToken),
    index("idx_mirror_expires").on(t.expiresAt),
  ]
);

export const mirrorResponses = pgTable(
  "mirror_responses",
  {
    id: text("id").primaryKey(),
    mtoken: text("mtoken")
      .notNull()
      .references(() => mirrorSessions.mtoken, { onDelete: "cascade" }),
    understood: text("understood").notNull(),
    unclear: text("unclear").notNull(),
    concerns: text("concerns").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_responses_mtoken").on(t.mtoken)]
);
