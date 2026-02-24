import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { log } from "@/lib/logger";
import { BriefDisplay } from "@/components/brief-display";
import type { FrameBrief } from "@/lib/db/schema";
import {
  FRAME_VIEW_META_DESCRIPTION,
  FRAME_EXPIRED_META_DESCRIPTION,
  FRAME_EXPIRED_CTA_COPY,
} from "@/lib/copy";

export const dynamic = "force-dynamic";

type FrameViewState =
  | { status: "valid"; title: string }
  | { status: "expired" }
  | { status: "not_found" };

async function getFrameViewState(token: string): Promise<FrameViewState> {
  const db = getDb();
  const rows = await db
    .select({
      title: schema.frames.title,
      expiresAt: schema.frames.expiresAt,
      brief: schema.frames.brief,
    })
    .from(schema.frames)
    .where(eq(schema.frames.token, token))
    .limit(1);

  if (!rows.length) return { status: "not_found" };
  const row = rows[0];
  if (row.expiresAt < new Date()) return { status: "expired" };
  if (!row.brief) return { status: "not_found" };
  return { status: "valid", title: row.title };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const state = await getFrameViewState(token);
  if (state.status === "valid") {
    return {
      title: `Frame Brief: ${state.title}`,
      description: FRAME_VIEW_META_DESCRIPTION,
    };
  }
  return {
    title: "Frame Brief",
    description: FRAME_EXPIRED_META_DESCRIPTION,
  };
}

interface ExpiredPageProps {
  params: Promise<{ token: string }>;
}

export default async function ViewBriefPage({ params }: ExpiredPageProps) {
  const { token } = await params;
  const db = getDb();

  const expiredCheck = await db
    .select({ token: schema.frames.token, expiresAt: schema.frames.expiresAt })
    .from(schema.frames)
    .where(eq(schema.frames.token, token))
    .limit(1);

  if (expiredCheck.length && expiredCheck[0].expiresAt < new Date()) {
    log({ event: "token.expired_access", token, route: "/frame/[token]/view" });
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="content-container text-center space-y-4 max-w-md">
          <h1 className="text-xl font-semibold">This brief has expired</h1>
          <p className="text-muted-foreground text-sm">
            {FRAME_EXPIRED_CTA_COPY}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/?view=frame"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create your own Frame
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rows = await db
    .select()
    .from(schema.frames)
    .where(and(eq(schema.frames.token, token), gt(schema.frames.expiresAt, new Date())))
    .limit(1);

  if (!rows.length || !rows[0].brief) {
    notFound();
  }

  const frame = rows[0];

  // Fetch mirror session if presentation type
  let mtoken: string | null = null;
  if (frame.type === "presentation") {
    const mirror = await db
      .select({ mtoken: schema.mirrorSessions.mtoken })
      .from(schema.mirrorSessions)
      .where(eq(schema.mirrorSessions.frameToken, token))
      .limit(1);
    mtoken = mirror[0]?.mtoken ?? null;
  }

  log({ event: "frame.viewed", token, isOwner: false });

  return (
    <BriefDisplay
      token={frame.token}
      title={frame.title}
      type={frame.type}
      brief={frame.brief as FrameBrief}
      expiresAt={frame.expiresAt.toISOString()}
      isOwner={false}
      mtoken={mtoken}
    />
  );
}
