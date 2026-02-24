"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { MIRROR_SHARE_ONE_LINER } from "@/lib/copy";

export function ShareContent({ mtoken }: { mtoken: string }) {
  const [copied, setCopied] = useState<"audience" | null>(null);

  const audienceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/mirror/${mtoken}/respond`
      : `/mirror/${mtoken}/respond`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied("audience");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Your Mirror session is ready</h1>
          <p className="text-muted-foreground text-sm">
            Share the feedback link after your all-hands or update. When
            responses are in, open the overlay to see how your message actually
            landed.
          </p>
          <p className="text-muted-foreground text-sm">
            {MIRROR_SHARE_ONE_LINER}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(audienceUrl)}
                className="gap-2"
              >
                {copied === "audience" ? (
                  <Check className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied === "audience" ? "Copied!" : "Copy audience feedback link"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Share with your audience after the presentation or conversation
            </TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href={`/mirror/${mtoken}/overlay`}>
              <ExternalLink className="h-3.5 w-3.5" />
              View Mirror overlay
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
