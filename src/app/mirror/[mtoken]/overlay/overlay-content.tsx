"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Check, Copy, MessageSquare, RefreshCw } from "lucide-react";
import { LoadingMessage } from "@/components/loading-message";
import { LOADING_COPY } from "@/lib/loading-copy";
import type { MirrorOverlay } from "@/lib/db/schema";
import { isRawFallback } from "@/lib/ai";
import type { MirrorOverlayStructured } from "@/lib/ai";

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

function normalizeOverlayCode(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  const replaced = trimmed.replace(/[\s_-]+/g, "-");
  return replaced.replace(/^-+/, "").replace(/-+$/, "");
}

const CHECK_COOLDOWN_MS = 5000;

export function OverlayContent({ mtoken }: { mtoken: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<MirrorData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const [copied, setCopied] = useState<"audience" | "code" | null>(null);
  const [nextCheckAt, setNextCheckAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const checkCooldownMs = Math.max(0, nextCheckAt - now);
  const checkCooldownSeconds = Math.ceil(checkCooldownMs / 1000);
  const canCheck = checkCooldownMs === 0;

  const authIssue =
    error != null &&
    (error.toLowerCase().includes("code required") ||
      error.toLowerCase().includes("invalid overlay access code") ||
      error.toLowerCase().includes("code is not configured") ||
      error.toLowerCase().includes("code has expired"));

  const audienceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/mirror/${mtoken}/respond`
      : `/mirror/${mtoken}/respond`;

  const buildApiPath = (path: string, code: string) => {
    const normalized = normalizeOverlayCode(code);
    if (!normalized) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}code=${encodeURIComponent(normalized)}`;
  };

  const copyToClipboard = async (text: string, type: "audience" | "code") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  const loadSession = async () => {
    const res = await fetch(buildApiPath(`/api/mirror/${mtoken}`, accessCode));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        typeof err.message === "string" ? err.message : "Unable to load mirror session";
      if (res.status === 410) {
        setError("This Mirror session has expired");
        return false;
      }
      if (res.status === 401 || res.status === 403) {
        setError(message);
        return false;
      }
      router.replace("/");
      return false;
    }

    const mirrorData = (await res.json()) as MirrorData;
    setError(null);
    setData(mirrorData);
    return true;
  };

  const checkForResponses = async () => {
    if (!canCheck || !codeSubmitted) return;
    setChecking(true);
    setNow(Date.now());
    setNextCheckAt(Date.now() + CHECK_COOLDOWN_MS);
    try {
      await loadSession();
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const fromUrl = normalizeOverlayCode(searchParams.get("code") ?? "");
    if (fromUrl) {
      setAccessCode(fromUrl);
      setCodeSubmitted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!codeSubmitted) return;
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mtoken, accessCode, codeSubmitted]);

  useEffect(() => {
    if (nextCheckAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [nextCheckAt]);

  const submitAccessCode = () => {
    const normalized = normalizeOverlayCode(accessCode);
    if (!normalized) {
      setError("Overlay access code required");
      return;
    }
    setAccessCode(normalized);
    setError(null);
    setData(null);
    setCodeSubmitted(true);
  };

  const generateOverlay = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(buildApiPath(`/api/mirror/${mtoken}/overlay`, accessCode), {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to generate overlay");
      }
      const result = await res.json();
      setData((prev) => (prev ? { ...prev, overlay: result.overlay } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!codeSubmitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="content-container space-y-4">
          <h1 className="text-2xl font-semibold">Mirror overlay access</h1>
          <p className="text-muted-foreground text-sm">
            Enter the overlay code to open this Mirror session.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="e.g. brave-fox-listens"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
            />
            <Button onClick={submitAccessCode}>Open overlay</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!data && !error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-8">
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
      <main className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="content-container space-y-4">
          <p className="text-destructive text-sm">{error}</p>
          {authIssue ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g. brave-fox-listens"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              <Button onClick={submitAccessCode}>Try code</Button>
            </div>
          ) : null}
          {!error.includes("expired") ? (
            <Button variant="outline" size="sm" onClick={checkForResponses} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Check for new responses
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  const noResponses = (data?.responseCount ?? 0) === 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">Mirror</h1>
            <Badge variant="outline" className="gap-1.5">
              <MessageSquare className="h-3 w-3" />
              {data?.responseCount ?? 0} response{data?.responseCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Share the audience link, then check manually for new responses.
          </p>
        </div>

        <section className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Copy the audience link after your talk. Keep the overlay code private. Both are required for the workflow.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 justify-start gap-2"
              onClick={() => copyToClipboard(audienceUrl, "audience")}
            >
              {copied === "audience" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy audience feedback link
            </Button>
            <Button
              variant="outline"
              className="h-10 justify-start gap-2"
              onClick={() => copyToClipboard(accessCode, "code")}
            >
              {copied === "code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy overlay code
            </Button>
          </div>
          <p className="h-5 text-xs text-muted-foreground">
            {copied === "audience" && "Audience link copied."}
            {copied === "code" && "Overlay code copied."}
          </p>
        </section>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkForResponses}
            disabled={!canCheck || checking}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check for new responses"}
          </Button>
          {!canCheck ? (
            <p className="text-xs text-muted-foreground">Wait {checkCooldownSeconds}s</p>
          ) : null}
        </div>

        {noResponses ? (
          <p className="text-sm text-muted-foreground">
            No audience responses yet.
          </p>
        ) : null}

        {!noResponses && !data?.overlay ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {data?.responseCount} response{data?.responseCount !== 1 ? "s" : ""} collected.
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
        ) : null}

        {generating && !data?.overlay ? (
          <div className="space-y-4">
            <LoadingMessage {...LOADING_COPY.overlay} />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : null}

        {data?.overlay ? (
          <section className="space-y-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {overlayToText(data.overlay)}
            </p>
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
          </section>
        ) : null}
      </div>
    </main>
  );
}
