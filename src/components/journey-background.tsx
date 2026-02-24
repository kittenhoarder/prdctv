"use client";

import { usePathname } from "next/navigation";

/**
 * Persistent full-viewport background for frame/mirror journeys. Renders in root
 * layout so it never unmounts on navigation, avoiding flashing between stages.
 */
export function JourneyBackground() {
  const pathname = usePathname();

  if (pathname.startsWith("/frame")) {
    return (
      <div
        className="fixed inset-0 z-0 w-full h-full"
        style={{
          backgroundColor: "oklch(0.14 0.02 200)",
          backgroundImage: "url(/assets/frame.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-black/25" aria-hidden />
      </div>
    );
  }

  if (pathname.startsWith("/mirror")) {
    return (
      <div
        className="fixed inset-0 z-0 w-full h-full"
        style={{
          backgroundColor: "oklch(0.12 0.02 260)",
          backgroundImage: "url(/assets/mirror.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-black/10" aria-hidden />
      </div>
    );
  }

  return null;
}
