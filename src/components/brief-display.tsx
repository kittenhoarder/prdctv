"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { FrameBrief } from "@/lib/db/schema";
import { isRawFallback } from "@/lib/ai";
import type { FrameBriefStructured } from "@/lib/ai";
import Link from "next/link";

interface BriefDisplayProps {
  token: string;
  title: string;
  type: string;
  brief: FrameBrief;
  expiresAt: string;
  isOwner: boolean;
  mtoken?: string | null;
}

/** Formats a legacy structured brief into a single readable text block. */
function structuredToText(brief: FrameBriefStructured): string {
  const lines: string[] = [];
  if (brief.realGoal) lines.push(`Real goal: ${brief.realGoal}`);
  if (brief.constraint) lines.push(`Key constraint: ${brief.constraint}`);
  if (brief.mustAgree) lines.push(`Must agree on: ${brief.mustAgree}`);
  if (brief.badOutcome) lines.push(`Bad outcome: ${brief.badOutcome}`);
  if (brief.agenda) lines.push(`Agenda: ${brief.agenda}`);
  if (brief.openingReadout) lines.push(`Opening readout: ${brief.openingReadout}`);
  return lines.join("\n\n");
}

export function BriefDisplay({
  token,
  title,
  type,
  brief,
  expiresAt,
  isOwner,
  mtoken,
}: BriefDisplayProps) {
  const [copied, setCopied] = useState<"brief" | "mirror" | null>(null);

  const briefUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/frame/${token}/view`
      : `/frame/${token}/view`;

  const mirrorUrl =
    mtoken && typeof window !== "undefined"
      ? `${window.location.origin}/mirror/${mtoken}/respond`
      : null;

  const copyToClipboard = async (text: string, type: "brief" | "mirror") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Resolve brief content to plain text — raw briefs use text directly;
  // legacy structured briefs are flattened to a single readable block.
  const briefText = isRawFallback(brief)
    ? brief.text
    : structuredToText(brief as FrameBriefStructured);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="content-container space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <Badge variant="secondary" className="capitalize">
              {type === "small" ? "Small meeting" : "Presentation"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Frame Brief · expires {expiryDate}
          </p>
        </div>

        {/* Brief content: single card for all briefs */}
        <Card className="rounded-lg border border-border py-0 shadow-none">
          <CardContent className="p-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {briefText}
            </p>
          </CardContent>
        </Card>

        {/* Share controls (owner only) */}
        {isOwner && (
          <div className="space-y-3 pt-2">
            <Separator />
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(briefUrl, "brief")}
                    className="gap-2"
                  >
                    {copied === "brief" ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied === "brief" ? "Copied!" : "Copy brief link"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Share this link before the meeting
                </TooltipContent>
              </Tooltip>

              <Button variant="ghost" size="sm" asChild className="gap-2">
                <Link href={briefUrl} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </Link>
              </Button>

              {mirrorUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(mirrorUrl, "mirror")}
                      className="gap-2"
                    >
                      {copied === "mirror" ? (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied === "mirror" ? "Copied!" : "Copy audience feedback link"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Share with your audience after the presentation
                  </TooltipContent>
                </Tooltip>
              )}

              {mtoken && (
                <Button variant="ghost" size="sm" asChild className="gap-2">
                  <Link href={`/mirror/${mtoken}/overlay`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Mirror overlay
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
