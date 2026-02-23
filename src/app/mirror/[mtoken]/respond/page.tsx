"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface FormData {
  understood: string;
  unclear: string;
  concerns: string;
}

export default function RespondPage({
  params,
}: {
  params: Promise<{ mtoken: string }>;
}) {
  const { mtoken } = use(params);

  const [form, setForm] = useState<FormData>({
    understood: "",
    unclear: "",
    concerns: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/mirror/${mtoken}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to submit");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="content-container text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mb-2">
            <Check className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold">Thanks for your feedback</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Your response has been recorded anonymously. The presenter will
            see an aggregated view — not individual responses.
          </p>
        </div>
      </main>
    );
  }

  const isValid =
    form.understood.trim() && form.unclear.trim() && form.concerns.trim();

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="content-container space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">How did that land?</h1>
          <p className="text-muted-foreground text-sm">
            Anonymous. Takes 60 seconds. Your answers help the presenter
            understand what actually came through.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-1.5">
              <Label htmlFor="understood">
                What did you understand from the presentation?
              </Label>
              <Textarea
                id="understood"
                placeholder="The main point I took away was…"
                value={form.understood}
                onChange={set("understood")}
                rows={3}
                required
                maxLength={2000}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1.5">
              <Label htmlFor="unclear">What was unclear?</Label>
              <Textarea
                id="unclear"
                placeholder="I wasn't sure about…"
                value={form.unclear}
                onChange={set("unclear")}
                rows={3}
                required
                maxLength={2000}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1.5">
              <Label htmlFor="concerns">What concerns you?</Label>
              <Textarea
                id="concerns"
                placeholder="My main concern is…"
                value={form.concerns}
                onChange={set("concerns")}
                rows={3}
                required
                maxLength={2000}
              />
            </CardContent>
          </Card>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            size="lg"
            disabled={!isValid || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </form>
      </div>
    </main>
  );
}
