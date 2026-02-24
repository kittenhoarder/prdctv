"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CompletionBar } from "@/components/completion-bar";

type MirrorFormVariant = "standalone" | "home";

interface MirrorFormProps {
  variant?: MirrorFormVariant;
}

interface MirrorFormState {
  intent: string;
  keyMessage: string;
  desiredAction: string;
}

export function MirrorForm({ variant = "standalone" }: MirrorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<MirrorFormState>({
    intent: "",
    keyMessage: "",
    desiredAction: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof MirrorFormState) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: form.intent,
          keyMessage: form.keyMessage,
          desiredAction: form.desiredAction,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create Mirror session");
      }

      const { mtoken, overlayCode } = await res.json();
      const overlayUrl =
        overlayCode && typeof overlayCode === "string"
          ? `/mirror/${mtoken}/overlay?code=${encodeURIComponent(
              overlayCode
            )}`
          : `/mirror/${mtoken}/overlay`;

      router.push(overlayUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setSubmitting(false);
    }
  };

  const isValid =
    form.intent.trim() &&
    form.keyMessage.trim() &&
    form.desiredAction.trim();

  const filled = [
    form.intent.trim(),
    form.keyMessage.trim(),
    form.desiredAction.trim(),
  ].filter(Boolean).length;
  const completionPercent = (filled / 3) * 100;

  const containerClasses =
    variant === "home"
      ? "p-6 sm:p-8 space-y-6"
      : "bg-background/25 backdrop-blur-md p-6 sm:p-8 space-y-8";

  return (
    <div className={containerClasses}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="intent">What you intend to convey</Label>
          <Textarea
            id="intent"
            placeholder="e.g. We need to shift focus to engineering to hit our product roadmap"
            value={form.intent}
            onChange={set("intent")}
            rows={3}
            required
            maxLength={2000}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="keyMessage">The one key message</Label>
          <Input
            id="keyMessage"
            placeholder="e.g. Engineering investment is the highest priority this quarter"
            value={form.keyMessage}
            onChange={set("keyMessage")}
            required
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desiredAction">
            What you want the audience to do
          </Label>
          <Input
            id="desiredAction"
            placeholder="e.g. Agree to reallocation without escalating"
            value={form.desiredAction}
            onChange={set("desiredAction")}
            required
            maxLength={500}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="space-y-3">
          <CompletionBar percent={completionPercent} />
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Creating…" : "Create Mirror session"}
          </Button>
        </div>
      </form>
    </div>
  );
}
