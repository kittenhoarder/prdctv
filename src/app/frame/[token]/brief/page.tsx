"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { LoadingMessage } from "@/components/loading-message";
import { LOADING_COPY } from "@/lib/loading-copy";
import { BriefDisplay } from "@/components/brief-display";
import type { FrameBrief } from "@/lib/db/schema";

interface FrameData {
  token: string;
  title: string;
  type: string;
  brief: FrameBrief | null;
  expiresAt: string;
}

export default function BriefPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [frame, setFrame] = useState<FrameData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mtoken, setMtoken] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/frame/${token}`);
      if (!res.ok) {
        if (res.status === 410) router.replace(`/frame/${token}/view`);
        else router.replace("/?error=session");
        return;
      }
      const data = await res.json();
      setFrame(data);

      // Fetch associated mirror session if it exists
      const mirrorRes = await fetch(`/api/mirror/by-frame/${token}`);
      if (mirrorRes.ok) {
        const mirrorData = await mirrorRes.json();
        setMtoken(mirrorData.mtoken ?? null);
      }

      if (!data.brief) {
        await generateBrief(data);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const generateBrief = async (currentFrame?: FrameData) => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/frame/${token}/brief`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to generate brief");
      }
      const data = await res.json();
      setFrame((prev) => ({
        ...(prev ?? (currentFrame as FrameData)),
        brief: data.brief,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!frame && !error) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="content-container space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateBrief()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (generating || !frame?.brief) {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="content-container space-y-6">
          <LoadingMessage {...LOADING_COPY.brief} />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <BriefDisplay
      token={frame.token}
      title={frame.title}
      type={frame.type}
      brief={frame.brief}
      expiresAt={frame.expiresAt}
      isOwner
      mtoken={mtoken}
    />
  );
}
