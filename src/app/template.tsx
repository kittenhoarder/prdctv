import { JourneyTransition } from "@/components/journey-transition";

/**
 * Re-mounts on navigation; wraps content so each route change gets a subtle fade-in.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <JourneyTransition>{children}</JourneyTransition>;
}
