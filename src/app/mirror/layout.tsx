import Link from "next/link";

/** Mirror journey: same full-viewport background as homepage Mirror view. */
export default function MirrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
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
      <div className="relative z-10">
        <Link
          href="/?view=mirror"
          className="fixed top-4 right-4 z-20 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          What is Mirror?
        </Link>
        {children}
      </div>
    </>
  );
}
