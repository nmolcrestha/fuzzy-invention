import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { pages, pageSections, sections, type Site } from "@/db/schema";
import { requireUser } from "@/lib/session";
import type { SiteContext } from "@/sections/components";
import { extraNavLinks, normalizeNavigation, socialLinks } from "@/sections/navigation";
import { chromeBlock, normalizeBlock, type SectionBlock } from "@/sections/registry";
import type { PageDocument } from "@/sections/site-page";
import { normalizeTheme } from "@/sections/theme";
import { findOwnedPage } from "@/server/sites/access";
import { getChecklist } from "@/server/sites/queries";

type PageSummary = { id: string; title: string; path: string; showInNav: boolean; isHome: boolean };

/** Site context for drafts: the menu follows the current (unpublished) page list. */
export function buildSiteContext(
  site: Pick<Site, "name" | "settings" | "navigation">,
  sitePages: PageSummary[],
): SiteContext {
  const navigation = normalizeNavigation(site.navigation);
  return {
    siteName: site.name,
    nav: [
      ...sitePages
        .filter((page) => page.showInNav)
        .map((page) => ({ label: page.title, href: page.path })),
      ...extraNavLinks(navigation.links),
    ],
    contact: {
      email: site.settings.contactEmail || undefined,
      phone: site.settings.phone || undefined,
      address: site.settings.address || undefined,
    },
    social: socialLinks(navigation.social),
    year: new Date().getFullYear(),
  };
}

export async function loadPageSections(pageId: string): Promise<SectionBlock[]> {
  const rows = await db
    .select({ section: sections, isHidden: pageSections.isHidden })
    .from(pageSections)
    .innerJoin(sections, eq(pageSections.sectionId, sections.id))
    .where(eq(pageSections.pageId, pageId))
    .orderBy(asc(pageSections.position));

  return rows.flatMap(({ section, isHidden }) => {
    const block = normalizeBlock({ ...section, isHidden });
    return block ? [block] : [];
  });
}

/** Everything the editor needs for one page. 404s unless the current user owns it. */
export async function loadEditor(siteId: string, pageId: string) {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found || found.site.id !== siteId) notFound();
  const { page, site } = found;

  const [blocks, sitePages] = await Promise.all([
    loadPageSections(page.id),
    db
      .select({
        id: pages.id,
        title: pages.title,
        path: pages.path,
        showInNav: pages.showInNav,
        isHome: pages.isHome,
      })
      .from(pages)
      .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
      .orderBy(asc(pages.position), asc(pages.createdAt)),
  ]);

  const doc: PageDocument = {
    header: chromeBlock("header", site.header),
    footer: chromeBlock("footer", site.footer),
    sections: blocks,
  };

  return {
    site: { id: site.id, name: site.name, subdomain: site.subdomain },
    page: { id: page.id, title: page.title, path: page.path },
    revisions: { page: page.draftRevision, design: site.designRevision },
    theme: normalizeTheme(site.theme),
    doc,
    pages: sitePages,
    siteContext: buildSiteContext(site, sitePages),
    checklist: await getChecklist(site.id),
  };
}

export type EditorData = Awaited<ReturnType<typeof loadEditor>>;
