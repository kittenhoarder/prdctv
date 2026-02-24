"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type FeedbackKind = "bug" | "idea" | "other";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<FeedbackKind>("other");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const source = useMemo(() => pathname ?? "unknown", [pathname]);

  const submit = async () => {
    const text = message.trim();
    if (!text) {
      setStatus("Add a short note first.");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, kind, source }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to send feedback");
      }

      setMessage("");
      setStatus("Thanks. Saved.");
      setTimeout(() => {
        setOpen(false);
        setStatus(null);
      }, 1200);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Feedback?
      </button>

      {open ? (
        <div className="mt-2 w-72 bg-background p-3 space-y-2 shadow-lg">
          <p className="text-xs text-muted-foreground">Quick product feedback</p>
          <div className="flex gap-1 text-xs">
            {(["bug", "idea", "other"] as FeedbackKind[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setKind(v)}
                className={`px-2 py-1 border ${kind === v ? "text-foreground" : "text-muted-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What would improve this step?"
            maxLength={500}
            rows={3}
            className="w-full resize-none bg-transparent border px-2 py-1.5 text-sm"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="text-xs underline underline-offset-2 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send"}
            </button>
            {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
