/** Minimal thin bar (0–100%) shown above form submit buttons. */
export function CompletionBar({ percent }: { percent: number }) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="h-1 w-full rounded-full bg-muted overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-foreground/80 rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
