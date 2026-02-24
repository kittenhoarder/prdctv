"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CompletionBar } from "@/components/completion-bar";

export default function MirrorCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    intent: "",
    keyMessage: "",
    desiredAction: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

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

      const { mtoken } = await res.json();
      router.push(`/mirror/${mtoken}/share`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const isValid =
    form.intent.trim() && form.keyMessage.trim() && form.desiredAction.trim();

  const filled = [
    form.intent.trim(),
    form.keyMessage.trim(),
    form.desiredAction.trim(),
  ].filter(Boolean).length;
  const completionPercent = (filled / 3) * 100;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container w-full max-w-[42rem]">
        <div className="bg-background/25 backdrop-blur-md p-6 sm:p-8 space-y-8">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="text-2xl font-semibold">Mirror</h1>
          <p className="text-muted-foreground text-sm">
            State your intent in three fields. Share the feedback link after
            your all-hands, update, or conversation. See how your message
            actually landed.
          </p>
        </div>

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
            <Label htmlFor="desiredAction">What you want the audience to do</Label>
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
      </div>
    </main>
  );
}
