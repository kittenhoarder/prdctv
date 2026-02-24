"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, MessageSquare } from "lucide-react";
import type { MirrorOverlay } from "@/lib/db/schema";
import { isRawFallback } from "@/lib/ai";
import type { MirrorOverlayStructured } from "@/lib/ai";

/** Formats a legacy structured overlay into a single readable text block. */
function overlayToText(overlay: MirrorOverlay): string {
  if (isRawFallback(overlay)) return overlay.text;
  const o = overlay as MirrorOverlayStructured;
  const lines: string[] = [];
  if (o.divergences?.length) {
    lines.push("Divergences:");
    o.divergences.forEach((d) => {
      lines.push(`Intended: ${d.intended}`);
      lines.push(`Received: ${d.received}`);
      lines.push(`Summary: ${d.gapSummary}`);
      lines.push("");
    });
  }
  if (o.themes?.length) {
    lines.push("Themes:");
    o.themes.forEach((t) => lines.push(`- ${t.theme} (${t.count})`));
    lines.push("");
  }
  if (o.followUp) lines.push("Follow-up:\n" + o.followUp);
  return lines.join("\n");
}

interface MirrorData {
  mtoken: string;
  intent: string;
  keyMessage: string;
  desiredAction: string;
  responseCount: number;
  overlay: MirrorOverlay | null;
  expiresAt: string;
}

export default function OverlayPage({
  params,
}: {
  params: Promise<{ mtoken: string }>;
}) {
  const { mtoken } = use(params);
  const router = useRouter();

  const [data, setData] = useState<MirrorData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/mirror/${mtoken}`);
      if (!res.ok) {
        if (res.status === 410) {
          setError("This Mirror session has expired");
          return;
        }
        router.replace("/");
        return;
      }
      const mirrorData = await res.json();
      setData(mirrorData);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mtoken]);

  const generateOverlay = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/mirror/${mtoken}/overlay`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to generate overlay");
      }
      const result = await res.json();
      setData((prev) => prev ? { ...prev, overlay: result.overlay } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!data && !error) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="content-container space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="content-container space-y-4">
          <p className="text-destructive text-sm">{error}</p>
          {!error.includes("expired") && (
            <Button variant="outline" size="sm" onClick={generateOverlay} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      </main>
    );
  }

  const noResponses = (data?.responseCount ?? 0) === 0;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="content-container space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">Mirror</h1>
            <Badge variant="outline" className="gap-1.5">
              <MessageSquare className="h-3 w-3" />
              {data?.responseCount ?? 0} response{data?.responseCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Here is how your message actually landed.
          </p>
        </div>

        {noResponses && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-muted-foreground text-sm">
                No audience responses yet. Share the feedback link and check back once responses come in.
              </p>
            </CardContent>
          </Card>
        )}

        {!noResponses && !data?.overlay && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {data?.responseCount} response{data?.responseCount !== 1 ? "s" : ""} collected. Ready to generate your Mirror overlay.
            </p>
            <Button onClick={generateOverlay} disabled={generating} className="gap-2">
              {generating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate overlay"
              )}
            </Button>
          </div>
        )}

        {generating && !data?.overlay && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Analysing responses…</p>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {data?.overlay && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {overlayToText(data.overlay)}
              </p>
            </CardContent>
          </Card>
        )}

        {data?.overlay && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateOverlay}
              disabled={generating}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
