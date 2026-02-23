"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Copy,
  Check,
  ExternalLink,
  Target,
  Lock,
  HandshakeIcon,
  AlertTriangle,
  List,
  Mic,
} from "lucide-react";
import type { FrameBrief } from "@/lib/db/schema";
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

const sections: Array<{
  key: keyof FrameBrief;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
}> = [
  { key: "realGoal", label: "Real goal", icon: <Target className="h-4 w-4" /> },
  { key: "constraint", label: "Key constraint", icon: <Lock className="h-4 w-4" /> },
  {
    key: "mustAgree",
    label: "Must agree on",
    icon: <HandshakeIcon className="h-4 w-4" />,
  },
  {
    key: "badOutcome",
    label: "Bad outcome",
    icon: <AlertTriangle className="h-4 w-4" />,
    accent: true,
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: <List className="h-4 w-4" />,
  },
  {
    key: "openingReadout",
    label: "Opening readout",
    icon: <Mic className="h-4 w-4" />,
  },
];

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

        {/* Brief sections */}
        <div className="space-y-1">
          {sections.map((s, i) => (
            <Card
              key={s.key}
              className={s.accent ? "border-destructive/30" : ""}
            >
              <CardHeader className="pb-1 pt-4 px-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className={s.accent ? "text-destructive" : "text-primary"}
                  >
                    {s.icon}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {s.label}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {brief[s.key]}
                </p>
              </CardContent>
              {i < sections.length - 1 && <Separator />}
            </Card>
          ))}
        </div>

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
