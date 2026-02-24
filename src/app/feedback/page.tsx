"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function FeedbackPage() {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          kind: kind && ["bug", "idea", "other"].includes(kind) ? kind : undefined,
          source: pathname ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to send feedback");
      }
      setSubmitted(true);
      setMessage("");
      setKind("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="content-container text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-semibold">Thanks, we got it</h1>
          <p className="text-muted-foreground text-sm">
            Your feedback helps us improve. You can send more anytime.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="content-container w-full max-w-[32rem] space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Send feedback</h1>
          <p className="text-muted-foreground text-sm">
            Report a problem, suggest an idea, or tell us what you think.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="What's on your mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              maxLength={2000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kind">Type (optional)</Label>
            <Select value={kind || undefined} onValueChange={setKind}>
              <SelectTrigger id="kind">
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="idea">Idea</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          <Button type="submit" disabled={!message.trim() || submitting}>
            {submitting ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      </div>
    </main>
  );
}
