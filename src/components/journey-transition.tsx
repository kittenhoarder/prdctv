"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";

const DURATION_HOME = "duration-700";
const DURATION_APP_SWITCH = "duration-500";
const DURATION_SAME_JOURNEY = "duration-150";
const DURATION_DEFAULT = "duration-300";

function sameJourney(prev: string, path: string): boolean {
  return (
    (prev.startsWith("/frame") && path.startsWith("/frame")) ||
    (prev.startsWith("/mirror") && path.startsWith("/mirror"))
  );
}

/**
 * Wraps app content so each route change fades in. Longer fade for homepage
 * and when switching between Frame and Mirror; shorter for in-journey steps.
 */
export function JourneyTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  const isHome = pathname === "/";
  const isAppSwitch =
    (prevPathRef.current.startsWith("/frame") && pathname.startsWith("/mirror")) ||
    (prevPathRef.current.startsWith("/mirror") && pathname.startsWith("/frame"));
  const isSameJourney = sameJourney(prevPathRef.current, pathname);

  const durationClass = isHome
    ? DURATION_HOME
    : isAppSwitch
      ? DURATION_APP_SWITCH
      : isSameJourney
        ? DURATION_SAME_JOURNEY
        : DURATION_DEFAULT;

  useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`animate-in fade-in-0 ${durationClass}`}
    >
      {children}
    </div>
  );
}
