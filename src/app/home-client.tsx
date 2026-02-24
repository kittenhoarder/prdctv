"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type View = "mirror" | "frame";

const BG_MIRROR = "/assets/mirror.webp";
const BG_FRAME = "/assets/frame.webp";

export function HomeClient({
  initialView,
  initialError,
}: {
  initialView: View;
  initialError?: "session";
}) {
  const [view, setView] = useState<View>(initialView);

  return (
    <>
      <div
        className="fixed inset-0 w-full h-full transition-opacity duration-150"
        style={{
          zIndex: 0,
          opacity: view === "mirror" ? 1 : 0,
          backgroundColor: "oklch(0.12 0.02 260)",
          backgroundImage: `url(${BG_MIRROR})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-black/10" aria-hidden />
      </div>
      <div
        className="fixed inset-0 w-full h-full transition-opacity duration-150"
        style={{
          zIndex: 0,
          opacity: view === "frame" ? 1 : 0,
          backgroundColor: "oklch(0.14 0.02 200)",
          backgroundImage: `url(${BG_FRAME})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-black/25" aria-hidden />
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8 sm:p-16">
        {initialError === "session" && (
          <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            That link wasn&apos;t found or has expired.
          </p>
        )}
        <div className="w-full max-w-2xl space-y-12">
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

          <div className="space-y-4 min-h-[8rem] sm:min-h-[9rem]">
            {view === "mirror" && (
              <>
                <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
                  Mirror
                </h1>
                <p className="text-xl sm:text-2xl tracking-tight max-w-xl leading-snug">
                  <span className="text-foreground">your message.</span>{" "}
                  <span className="text-muted-foreground font-normal">
                    Close the gap between what you meant and what they heard.
                  </span>
                </p>
              </>
            )}
            {view === "frame" && (
              <>
                <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
                  Frame
                </h1>
                <p className="text-xl sm:text-2xl tracking-tight max-w-xl leading-snug">
                  <span className="text-foreground">your message.</span>{" "}
                  <span className="text-muted-foreground font-normal">
                    Improve alignment.
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[3.25rem]">
              {view === "mirror" && (
                <Link
                  href="/mirror/create"
                  className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-base font-semibold tracking-tight rounded-none transition-opacity hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start sm:col-span-2"
                >
                  See how it landed
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              {view === "frame" && (
                <>
                  <Link
                    href="/frame/create?type=small"
                    className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-base font-semibold tracking-tight rounded-none transition-opacity hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    Small Meeting
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/frame/create?type=presentation"
                    className="group inline-flex items-center gap-3 bg-foreground text-background px-8 py-4 text-base font-semibold tracking-tight rounded-none transition-opacity hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start"
                  >
                    Presentation
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground max-w-xl min-h-[1.5rem]">
              {view === "mirror"
                ? "State your intent in three fields. Share a link with your audience. See exactly where your message landed — and where it didn't."
                : "Describe your meeting or presentation in plain language. Frame asks three questions and generates a shareable brief — what you're deciding, the real constraint, and what success looks like — before anyone walks in."}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
