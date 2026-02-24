import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MIRROR_SHARE_META_DESCRIPTION } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Share feedback link · Mirror",
  description: MIRROR_SHARE_META_DESCRIPTION,
};

export default async function MirrorSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ mtoken: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { mtoken } = await params;
  const { code } = await searchParams;
  const codeSuffix = code ? `?code=${encodeURIComponent(code)}` : "";
  redirect(`/mirror/${mtoken}/overlay${codeSuffix}`);
}
