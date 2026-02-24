import type { Metadata } from "next";
import { MIRROR_SHARE_META_DESCRIPTION } from "@/lib/copy";
import { ShareContent } from "./share-content";

export const metadata: Metadata = {
  title: "Share feedback link · Mirror",
  description: MIRROR_SHARE_META_DESCRIPTION,
};

export default async function MirrorSharePage({
  params,
}: {
  params: Promise<{ mtoken: string }>;
}) {
  const { mtoken } = await params;
  return <ShareContent mtoken={mtoken} />;
}
