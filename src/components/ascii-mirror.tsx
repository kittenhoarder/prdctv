"use client";

import { useRef, useEffect, useCallback, useState } from "react";

const FILL_CHARS = [".", "*", "+", ":", "~", "·"];

function buildGrid(rows: number, cols: number): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(FILL_CHARS[(r * cols + c) % FILL_CHARS.length]);
    }
    grid.push(row);
  }
  return grid;
}

const DESKTOP = { rows: 14, cols: 28, shine: 140 };
const MOBILE = { rows: 9, cols: 18, shine: 100 };

export function AsciiMirror() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<HTMLSpanElement[]>([]);
  const posCache = useRef<Float32Array | null>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const autoRef = useRef<number>(0);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const cfg = isDesktop ? DESKTOP : MOBILE;
  const grid = buildGrid(cfg.rows, cfg.cols);

  const computePositions = useCallback(() => {
    const cells = cellRefs.current;
    if (!cells.length) return;
    const arr = new Float32Array(cells.length * 2);
    for (let i = 0; i < cells.length; i++) {
      const rect = cells[i].getBoundingClientRect();
      arr[i * 2] = rect.left + rect.width / 2;
      arr[i * 2 + 1] = rect.top + rect.height / 2;
    }
    posCache.current = arr;
  }, []);

  const applyShine = useCallback(
    (mx: number, my: number) => {
      const cells = cellRefs.current;
      const pos = posCache.current;
      if (!pos || !cells.length) return;
      const radius = cfg.shine;
      for (let i = 0; i < cells.length; i++) {
        const cx = pos[i * 2];
        const cy = pos[i * 2 + 1];
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          const t = 1 - dist / radius;
          const angle = Math.atan2(dy, dx);
          const hue = ((angle * 180) / Math.PI + 360) % 360;
          cells[i].style.color = `hsl(${hue}, 80%, 65%)`;
          cells[i].style.opacity = String(0.3 + t * 0.7);
        } else {
          cells[i].style.color = "";
          cells[i].style.opacity = "0.25";
        }
      }
    },
    [cfg.shine]
  );

  useEffect(() => {
    computePositions();
    const onResize = () => computePositions();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computePositions, isDesktop]);

  // Mouse tracking (desktop)
  useEffect(() => {
    if (!isDesktop) return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          applyShine(mouseRef.current.x, mouseRef.current.y);
          rafRef.current = 0;
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDesktop, applyShine]);

  // Auto-sweep animation (mobile)
  useEffect(() => {
    if (isDesktop) return;
    const container = containerRef.current;
    if (!container) return;

    let t = 0;
    const animate = () => {
      const rect = container.getBoundingClientRect();
      t += 0.008;
      const mx = rect.left + ((Math.sin(t) + 1) / 2) * rect.width;
      const my = rect.top + ((Math.cos(t * 0.7) + 1) / 2) * rect.height;
      applyShine(mx, my);
      autoRef.current = requestAnimationFrame(animate);
    };

    // Small delay so positions are computed
    const timer = setTimeout(() => {
      computePositions();
      autoRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (autoRef.current) cancelAnimationFrame(autoRef.current);
    };
  }, [isDesktop, applyShine, computePositions]);

  let cellIdx = 0;

  return (
    <div ref={containerRef} className="select-none" aria-hidden="true">
      <pre className="font-mono text-xs sm:text-sm leading-tight">
        {/* Top border */}
        <span className="text-muted-foreground/40">
          {"+" + "─".repeat(cfg.cols * 2 + 2) + "+\n"}
        </span>
        {grid.map((row, r) => (
          <span key={r}>
            <span className="text-muted-foreground/40">{"│ "}</span>
            {row.map((ch, c) => {
              const idx = cellIdx++;
              return (
                <span
                  key={c}
                  ref={(el) => {
                    if (el) cellRefs.current[idx] = el;
                  }}
                  className="text-muted-foreground"
                  style={{ opacity: 0.25, transition: "color 0.15s, opacity 0.15s" }}
                >
                  {ch + " "}
                </span>
              );
            })}
            <span className="text-muted-foreground/40">{"│\n"}</span>
          </span>
        ))}
        {/* Bottom border */}
        <span className="text-muted-foreground/40">
          {"+" + "─".repeat(cfg.cols * 2 + 2) + "+"}
        </span>
      </pre>
    </div>
  );
}
