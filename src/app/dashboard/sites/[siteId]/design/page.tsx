import type { Metadata } from "next";

import { ThemeEditor } from "@/components/sites/theme-editor";
import { normalizeTheme } from "@/sections/theme";
import { getMySiteOr404, listPages } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/design">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Design` };
}

export default async function SiteDesignPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/design">) {
  const { siteId } = await params;
  const [site, sitePages] = await Promise.all([getMySiteOr404(siteId), listPages(siteId)]);
  const previewPage = sitePages.find((page) => page.isHome) ?? sitePages[0];

  return (
    <ThemeEditor
      siteId={site.id}
      initial={normalizeTheme(site.theme)}
      previewPageId={previewPage?.id ?? null}
    />
  );
}
