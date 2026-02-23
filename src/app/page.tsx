"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AsciiMirror } from "@/components/ascii-mirror";
import { AsciiFrame } from "@/components/ascii-frame";

type View = "mirror" | "frame";

export default function Home() {
  const [view, setView] = useState<View>("mirror");

  return (
    <main className="min-h-screen flex items-center justify-center p-8 sm:p-16">
      <div className="w-full max-w-2xl space-y-12">

        {/* ── Toggle ─────────────────────────────────────────────── */}
        <nav className="flex gap-6 font-mono text-xs uppercase tracking-widest">
          <button
            onClick={() => setView("mirror")}
            className={`pb-1 transition-colors ${
              view === "mirror"
                ? "text-foreground border-b border-foreground"
                : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            Mirror
          </button>
          <button
            onClick={() => setView("frame")}
            className={`pb-1 transition-colors ${
              view === "frame"
                ? "text-foreground border-b border-foreground"
                : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            Frame
          </button>
        </nav>

        {/* ── Mirror view ────────────────────────────────────────── */}
        {view === "mirror" && (
          <div className="space-y-10">
            <AsciiMirror />

            <div className="space-y-4">
              <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
                Mirror
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground tracking-tight max-w-xl leading-snug">
                How your communication actually landed,{" "}
                <span className="text-foreground">
                  not how you intended it.
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/mirror/create"
                className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-base font-semibold tracking-tight rounded-none transition-opacity hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start"
              >
                See how it landed
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Three fields.&nbsp;&nbsp;Sixty seconds.&nbsp;&nbsp;No account
                required.
              </p>
            </div>
          </div>
        )}

        {/* ── Frame view ─────────────────────────────────────────── */}
        {view === "frame" && (
          <div className="space-y-10">
            <AsciiFrame />

            <div className="space-y-4">
              <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
                Frame
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground tracking-tight max-w-xl leading-snug">
                Know exactly what you want{" "}
                <span className="text-foreground">
                  before you walk in.
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/frame/create?type=small"
                  className="group block border border-foreground/10 p-5 rounded-none hover:border-foreground transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">
                      Small Meeting
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Frame Brief before the meeting.
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-3 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/frame/create?type=presentation"
                  className="group block border border-foreground/10 p-5 rounded-none hover:border-foreground transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">
                      Presentation
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Frame Brief + Mirror audience feedback.
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                AI-generated brief.&nbsp;&nbsp;Shareable.&nbsp;&nbsp;No account
                required.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
