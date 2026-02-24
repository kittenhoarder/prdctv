import { HomeClient } from "./home-client";

type View = "mirror" | "frame";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const initialView: View =
    params.view === "frame" || params.view === "mirror" ? params.view : "mirror";

  return <HomeClient initialView={initialView} />;
}
