"use client";

import { useState } from "react";
import { MirrorForm } from "./mirror/mirror-form";
import { FrameFormSmall } from "./frame/frame-form-small";

type View = "mirror" | "frame";
type FrameType = "small" | "presentation";

const BG_MIRROR = "/assets/mirror.webp";
const BG_FRAME = "/assets/frame.webp";

/** Client-only hero content when view has changed from initial (avoids duplicating server-rendered LCP hero). */
function MirrorHero() {
  return (
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
  );
}

function FrameHero() {
  return (
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
  );
}

export function HomeClient({
  initialView,
  initialError,
  initialHero,
}: {
  initialView: View;
  initialError?: "session";
  /** Server-rendered hero for initial view (LCP element in first HTML). */
  initialHero: React.ReactNode;
}) {
  const [view, setView] = useState<View>(initialView);
  const [frameType, setFrameType] = useState<FrameType>("small");

  return (
    <>
      <div
        className="fixed inset-0 w-full h-full transition-opacity duration-150"
        style={{
          zIndex: 0,
          opacity: 1,
          backgroundColor: view === "mirror" ? "oklch(0.12 0.02 260)" : "oklch(0.14 0.02 200)",
          backgroundImage: `url(${view === "mirror" ? BG_MIRROR : BG_FRAME})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      >
        <div className={`absolute inset-0 ${view === "mirror" ? "bg-black/10" : "bg-black/25"}`} aria-hidden />
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 sm:p-12">
        {initialError === "session" && (
          <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            That link wasn&apos;t found or has expired.
          </p>
        )}
        <div className="w-full max-w-4xl">
          <nav className="relative z-20 flex items-end gap-2 pl-3 sm:pl-6">
            <button
              onClick={() => setView("mirror")}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
                view === "mirror"
                  ? "bg-background/55 text-foreground"
                  : "bg-background/28 text-muted-foreground hover:text-foreground cursor-pointer"
              }`}
            >
              Mirror
            </button>
            <button
              onClick={() => setView("frame")}
              className={`px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
                view === "frame"
                  ? "bg-background/55 text-foreground"
                  : "bg-background/28 text-muted-foreground hover:text-foreground cursor-pointer"
              }`}
            >
              Frame
            </button>
          </nav>

          <section className="bg-background/52 backdrop-blur-xl px-5 pb-6 pt-6 sm:px-10 sm:pb-10 sm:pt-9">
            <div className="space-y-2 min-h-[8rem] sm:min-h-[9rem]">
              {view === initialView ? initialHero : view === "mirror" ? <MirrorHero /> : <FrameHero />}
              {view === "mirror" && (
                <p className="text-xs text-muted-foreground max-w-xl">
                  Start a Mirror by filling in these three fields. Share the anonymous feedback link with your audience and see exactly where your message landed — and where it didn&apos;t.
                </p>
              )}
              {view === "frame" && (
                <p className="text-xs text-muted-foreground max-w-xl">
                  Most meetings start here. Describe it in plain language and we&apos;ll generate a clear one-page Frame before anyone walks in.
                </p>
              )}
            </div>

            {view === "mirror" && (
              <MirrorForm variant="home" />
            )}

            {view === "frame" && (
              <div className="space-y-3 pt-2">
                <FrameFormSmall type={frameType} />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setFrameType((prev) =>
                        prev === "small" ? "presentation" : "small"
                      )
                    }
                    className="text-xs font-medium underline underline-offset-4 text-foreground hover:opacity-80 cursor-pointer"
                  >
                    {frameType === "small"
                      ? "Frame your Presentations"
                      : "Switch to Small Meeting"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
