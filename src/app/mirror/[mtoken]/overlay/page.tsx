"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ArrowRight, MessageSquare } from "lucide-react";
import type { MirrorOverlay } from "@/lib/db/schema";
import { isRawFallback } from "@/lib/ai";

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

        {data?.overlay && isRawFallback(data.overlay) && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {data.overlay.text}
              </p>
            </CardContent>
          </Card>
        )}

        {data?.overlay && !isRawFallback(data.overlay) && (
          <Tabs defaultValue="divergences" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="divergences">Gaps</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="followup">Follow-up</TabsTrigger>
            </TabsList>

            <TabsContent value="divergences" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Top divergences</h2>
                <p className="text-muted-foreground text-xs">
                  Where intent and reception diverged most
                </p>
              </div>
              {data.overlay.divergences.map((d, i) => (
                <Card key={i} className="border-muted">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          Intended
                        </p>
                        <p className="text-sm leading-relaxed">{d.intended}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block mt-5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs text-destructive uppercase tracking-wide font-medium">
                          Received
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {d.received}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground italic">
                      {d.gapSummary}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="themes" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Recurring themes</h2>
                <p className="text-muted-foreground text-xs">
                  Topics that appeared across multiple responses
                </p>
              </div>
              {data.overlay.themes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No recurring themes identified.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.overlay.themes.map((t, i) => (
                    <Card key={i}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <span className="text-sm">{t.theme}</span>
                        <Badge variant="secondary">{t.count}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="followup" className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-medium">Suggested follow-up</h2>
                <p className="text-muted-foreground text-xs">
                  A draft message that addresses the top gaps. Edit before sending.
                </p>
              </div>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {data.overlay.followUp}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
