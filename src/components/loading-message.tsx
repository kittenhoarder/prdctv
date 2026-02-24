"use client";

import { useEffect, useState } from "react";

const DEFAULT_ROTATE_MS = 4000;

export interface LoadingMessageProps {
  main: string;
  subline?: string;
  rotatingHints?: string[];
  rotateIntervalMs?: number;
}

/**
 * Presentational loading text: main line plus optional static subline or
 * rotating hints. No journey logic — pass config from LOADING_COPY.
 */
export function LoadingMessage({
  main,
  subline,
  rotatingHints,
  rotateIntervalMs = DEFAULT_ROTATE_MS,
}: LoadingMessageProps) {
  const [hintIndex, setHintIndex] = useState(0);
  const useRotation = rotatingHints && rotatingHints.length > 0 && !subline;

  useEffect(() => {
    if (!useRotation) return;
    const id = setInterval(() => {
      setHintIndex((i) => (i + 1) % rotatingHints!.length);
    }, rotateIntervalMs);
    return () => clearInterval(id);
  }, [useRotation, rotatingHints, rotateIntervalMs]);

  const secondary =
    subline ?? (useRotation && rotatingHints ? rotatingHints[hintIndex] : null);

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{main}</p>
      {secondary && (
        <p className="text-xs text-muted-foreground/80">{secondary}</p>
      )}
    </div>
  );
}
