"use client";

import { useRef, useEffect, useCallback, useState } from "react";

type Dir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "C";

const EYE_MAP: Record<Dir, [string, string]> = {
  C:  ["O", "O"],
  N:  ["^", "^"],
  NE: ["·", "°"],
  E:  ["·", "o"],
  SE: [".", "o"],
  S:  ["v", "v"],
  SW: ["o", "."],
  W:  ["o", "·"],
  NW: ["°", "·"],
};

function angleToDir(angle: number): Dir {
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return "E";
  if (deg >= 22.5 && deg < 67.5) return "SE";
  if (deg >= 67.5 && deg < 112.5) return "S";
  if (deg >= 112.5 && deg < 157.5) return "SW";
  if (deg >= 157.5 && deg < 202.5) return "W";
  if (deg >= 202.5 && deg < 247.5) return "NW";
  if (deg >= 247.5 && deg < 292.5) return "N";
  return "NE";
}

// Desktop: ~20 rows x 36 cols
const DESKTOP_ART = (lEye: string, rEye: string) => [
  "+====================================+",
  "||                                  ||",
  "||            _______               ||",
  "||           /       \\              ||",
  "||          /         \\             ||",
  `||         |  ${lEye}     ${rEye}  |            ||`,
  "||         |     ^     |            ||",
  "||         |    \\_/    |            ||",
  "||          \\_________/             ||",
  "||              |||                 ||",
  "||          /---|||---\\             ||",
  "||         /    |||    \\            ||",
  "||              |||                 ||",
  "||             / | \\               ||",
  "||            /  |  \\              ||",
  "||                                  ||",
  "+====================================+",
];

// Mobile: ~14 rows x 28 cols
const MOBILE_ART = (lEye: string, rEye: string) => [
  "+==========================+",
  "||                        ||",
  "||         _____          ||",
  "||        /     \\         ||",
  `||       | ${lEye}   ${rEye} |        ||`,
  "||       |   ^   |        ||",
  "||       |  \\_/  |        ||",
  "||        \\_____/         ||",
  "||           |||          ||",
  "||        /--|||--\\       ||",
  "||           |||          ||",
  "||          / | \\         ||",
  "||                        ||",
  "+==========================+",
];

export function AsciiFrame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Dir>("C");
  const [isDesktop, setIsDesktop] = useState(true);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const computeDir = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.35;
    const dx = mouseRef.current.x - cx;
    const dy = mouseRef.current.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) {
      setDir("C");
    } else {
      setDir(angleToDir(Math.atan2(dy, dx)));
    }
  }, []);

  // Mouse tracking (desktop)
  useEffect(() => {
    if (!isDesktop) return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          computeDir();
          rafRef.current = 0;
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDesktop, computeDir]);

  // Wandering eyes (mobile)
  useEffect(() => {
    if (isDesktop) return;
    const dirs: Dir[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "C"];
    const interval = setInterval(() => {
      setDir(dirs[Math.floor(Math.random() * dirs.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isDesktop]);

  const [lEye, rEye] = EYE_MAP[dir];
  const lines = isDesktop ? DESKTOP_ART(lEye, rEye) : MOBILE_ART(lEye, rEye);

  return (
    <div ref={containerRef} className="select-none" aria-hidden="true">
      <pre className="font-mono text-xs sm:text-sm leading-tight text-muted-foreground/60">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
