import { notFound } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { log } from "@/lib/logger";
import { BriefDisplay } from "@/components/brief-display";
import type { FrameBrief } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

interface ExpiredPageProps {
  params: Promise<{ token: string }>;
}

export default async function ViewBriefPage({ params }: ExpiredPageProps) {
  const { token } = await params;
  const db = getDb();

  // Check for expiry first for better UX messaging
  const expiredCheck = await db
    .select({ token: schema.frames.token, expiresAt: schema.frames.expiresAt })
    .from(schema.frames)
    .where(eq(schema.frames.token, token))
    .limit(1);

  if (expiredCheck.length && expiredCheck[0].expiresAt < new Date()) {
    log({ event: "token.expired_access", token, route: "/frame/[token]/view" });
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="content-container text-center space-y-3">
          <h1 className="text-xl font-semibold">This brief has expired</h1>
          <p className="text-muted-foreground text-sm">
            Frame Briefs expire after 7 days. Ask the creator to make a new one.
          </p>
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
