"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompletionBar } from "@/components/completion-bar";
import { Separator } from "@/components/ui/separator";

interface FormData {
  title: string;
  audience: string;
  stakes: string;
  outcome: string;
  context: string;
  intent: string;
  keyMessage: string;
  desiredAction: string;
}

type FrameType = "small" | "presentation";

export function FrameFormSmall({ type = "small" }: { type?: FrameType }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    title: "",
    audience: "",
    stakes: "",
    outcome: "",
    context: "",
    intent: "",
    keyMessage: "",
    desiredAction: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: form.title,
          audience: form.audience,
          stakes: form.stakes,
          outcome: form.outcome,
          context: form.context || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create frame");
      }

      const { token } = await res.json();

      if (type === "presentation") {
        const mirrorRes = await fetch("/api/mirror", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frameToken: token,
            intent: form.intent,
            keyMessage: form.keyMessage,
            desiredAction: form.desiredAction,
          }),
        });

        if (!mirrorRes.ok) {
          const err = await mirrorRes.json().catch(() => ({}));
          throw new Error(err.message ?? "Failed to create mirror session");
        }
      }

      router.push(`/frame/${token}/questions`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setSubmitting(false);
    }
  };

  const isValid =
    form.title.trim() &&
    form.audience.trim() &&
    form.stakes &&
    form.outcome.trim() &&
    (type === "small" ||
      (form.intent.trim() &&
        form.keyMessage.trim() &&
        form.desiredAction.trim()));

  const requiredFields = type === "small"
    ? [form.title, form.audience, form.stakes, form.outcome]
    : [
        form.title,
        form.audience,
        form.stakes,
        form.outcome,
        form.intent,
        form.keyMessage,
        form.desiredAction,
      ];
  const filled = requiredFields.filter((v) => String(v).trim()).length;
  const completionPercent = requiredFields.length
    ? (filled / requiredFields.length) * 100
    : 0;

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="frame-title">Meeting title</Label>
          <Input
            id="frame-title"
            placeholder="e.g. Q3 budget review"
            value={form.title}
            onChange={set("title")}
            required
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="frame-audience">Who&apos;s in the room?</Label>
          <Input
            id="frame-audience"
            placeholder="e.g. Finance team leads, VP Ops"
            value={form.audience}
            onChange={set("audience")}
            required
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="frame-stakes">Stakes level</Label>
          <Select
            value={form.stakes}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, stakes: v }))
            }
          >
            <SelectTrigger id="frame-stakes">
              <SelectValue placeholder="Select stakes level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                Low — informational or routine
              </SelectItem>
              <SelectItem value="medium">
                Medium — some risk, reversible
              </SelectItem>
              <SelectItem value="high">High — significant impact</SelectItem>
              <SelectItem value="critical">
                Critical — irreversible or major
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="frame-outcome">Desired outcome</Label>
          <Input
            id="frame-outcome"
            placeholder="e.g. Approve revised budget allocation"
            value={form.outcome}
            onChange={set("outcome")}
            required
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="frame-context">
            Context{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            id="frame-context"
            placeholder="Any background that helps — recent events, history, blockers"
            value={form.context}
            onChange={set("context")}
            rows={4}
            maxLength={2000}
          />
        </div>

        {type === "presentation" && (
          <>
            <Separator />
            <div className="space-y-1">
              <h2 className="text-base font-medium">Your communication intent</h2>
              <p className="text-muted-foreground text-sm">
                We&apos;ll compare this against how your audience actually receives it.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frame-intent">What you intend to convey</Label>
              <Textarea
                id="frame-intent"
                placeholder="e.g. We need to shift focus to engineering to hit our product roadmap"
                value={form.intent}
                onChange={set("intent")}
                rows={3}
                required
                maxLength={2000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frame-key-message">The one key message</Label>
              <Input
                id="frame-key-message"
                placeholder="e.g. Engineering investment is the highest priority this quarter"
                value={form.keyMessage}
                onChange={set("keyMessage")}
                required
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frame-desired-action">
                What you want the audience to do
              </Label>
              <Input
                id="frame-desired-action"
                placeholder="e.g. Agree to reallocation without escalating"
                value={form.desiredAction}
                onChange={set("desiredAction")}
                required
                maxLength={500}
              />
            </div>
          </>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="space-y-3">
          <CompletionBar percent={completionPercent} />
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Creating…" : "Generate clarifying questions"}
          </Button>
        </div>
      </form>
    </div>
  );
}
