import { HomeClient } from "./home-client";

type View = "mirror" | "frame";

/** Server-rendered hero so LCP element exists in initial HTML (fixes Lighthouse NO_LCP). */
function HeroInitial({ view }: { view: View }) {
  if (view === "mirror") {
    return (
      <>
        <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
          Mirror
        </h1>
        <p className="text-xl sm:text-2xl tracking-tight max-w-xl leading-snug">
          <span className="text-foreground">your message.</span>{" "}
          <span className="text-muted-foreground font-normal">
            Close the gap between what you meant and what they heard.
          </span>
        </p>
      </>
    );
  }
  return (
    <>
      <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter leading-none text-foreground uppercase">
        Frame
      </h1>
      <p className="text-xl sm:text-2xl tracking-tight max-w-xl leading-snug">
        <span className="text-foreground">your message.</span>{" "}
        <span className="text-muted-foreground font-normal">
          Improve alignment.
        </span>
      </p>
    </>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; error?: string }>;
}) {
  const params = await searchParams;
  const initialView: View =
    params.view === "frame" || params.view === "mirror" ? params.view : "mirror";

  return (
    <HomeClient
      initialView={initialView}
      initialError={params.error === "session" ? "session" : undefined}
      initialHero={<HeroInitial view={initialView} />}
    />
  );
}
