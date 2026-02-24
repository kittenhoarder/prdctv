import type { Metadata } from "next";
import { MIRROR_RESPOND_META_DESCRIPTION } from "@/lib/copy";
import { RespondForm } from "./respond-form";

export const metadata: Metadata = {
  title: "Give feedback · Mirror",
  description: MIRROR_RESPOND_META_DESCRIPTION,
};

export default async function RespondPage({
  params,
}: {
  params: Promise<{ mtoken: string }>;
}) {
  const { mtoken } = await params;
  return <RespondForm mtoken={mtoken} />;
}
