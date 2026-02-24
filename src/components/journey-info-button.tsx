"use client";

import { useState } from "react";

type JourneyInfoButtonProps = {
  label: string;
  title: string;
  description: string;
};

export function JourneyInfoButton({
  label,
  title,
  description,
}: JourneyInfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-30 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative z-10 w-full max-w-md bg-background p-5 space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm underline underline-offset-2 hover:opacity-80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
