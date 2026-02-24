import Link from "next/link";

/** Frame journey: background is rendered by JourneyBackground in root layout. */
export default function FrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10">
      <Link
        href="/?view=frame"
        className="fixed top-4 right-4 z-20 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        What is Frame?
      </Link>
      {children}
    </div>
  );
}
