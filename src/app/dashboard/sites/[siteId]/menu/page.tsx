import type { Metadata } from "next";

import { MenuEditor } from "@/components/sites/menu-editor";
import { normalizeNavigation } from "@/sections/navigation";
import { getMySiteOr404, listPages } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/menu">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Menu & social` };
}

export default async function SiteMenuPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/menu">) {
  const { siteId } = await params;
  const [site, sitePages] = await Promise.all([getMySiteOr404(siteId), listPages(siteId)]);

  return (
    <MenuEditor
      key={site.updatedAt.toISOString()}
      siteId={site.id}
      initial={normalizeNavigation(site.navigation)}
      menuPages={sitePages
        .filter((page) => page.showInNav)
        .map((page) => ({
          id: page.id,
          title: page.title,
          isLive: page.publishedVersionId !== null,
        }))}
    />
  );
}
