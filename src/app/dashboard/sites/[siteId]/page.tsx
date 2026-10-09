import type { Metadata } from "next";

import { PageManager } from "@/components/pages/page-manager";
import { getMySiteOr404, listPages } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Pages` };
}

export default async function SitePagesPage({ params }: PageProps<"/dashboard/sites/[siteId]">) {
  const { siteId } = await params;
  const [site, pages] = await Promise.all([getMySiteOr404(siteId), listPages(siteId)]);

  return (
    <PageManager
      siteId={site.id}
      subdomain={site.subdomain}
      pages={pages.map((page) => ({
        id: page.id,
        title: page.title,
        path: page.path,
        isHome: page.isHome,
        showInNav: page.showInNav,
        publishedAt: page.publishedAt,
        hasUnpublishedChanges: page.hasUnpublishedChanges,
      }))}
    />
  );
}
