import type { Metadata } from "next";
import { MIRROR_OVERLAY_META_DESCRIPTION } from "@/lib/copy";
import { OverlayContent } from "./overlay-content";

export const metadata: Metadata = {
  title: "How it landed · Mirror",
  description: MIRROR_OVERLAY_META_DESCRIPTION,
};

export default async function OverlayPage({
  params,
}: {
  params: Promise<{ mtoken: string }>;
}) {
  const { mtoken } = await params;
  return <OverlayContent mtoken={mtoken} />;
}
