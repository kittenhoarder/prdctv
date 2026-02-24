import Link from "next/link";

/** Frame journey: same full-viewport background as homepage Frame view. */
export default function FrameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
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
      <div className="relative z-10">
        <Link
          href="/?view=frame"
          className="fixed top-4 right-4 z-20 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          What is Frame?
        </Link>
        {children}
      </div>
    </>
  );
}
