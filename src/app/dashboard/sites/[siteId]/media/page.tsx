import type { Metadata } from "next";

import { MediaLibrary } from "@/components/media/media-library";
import { listSiteMedia } from "@/server/media/queries";
import { uploadMode } from "@/server/media/storage";
import { getMySiteOr404 } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/media">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Media` };
}

export default async function SiteMediaPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/media">) {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  const items = await listSiteMedia(site.id);

  return <MediaLibrary siteId={site.id} initialItems={items} uploadMode={uploadMode} />;
}
