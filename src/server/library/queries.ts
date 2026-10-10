import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { pages, pageSections, sections } from "@/db/schema";
import { normalizeBlock, type SectionBlock } from "@/sections/registry";

/** What the editor needs to know about a shared section (requirement SEC-8). */
export type SharedInfo = {
  name: string;
  /** Content revision the editor last saw; sent back with edits to detect clashes. */
  revision: number;
  /** Pages it's placed on, in page order. */
  pages: { id: string; title: string }[];
};

export type LibraryItem = SharedInfo & { block: SectionBlock };

/** Every saved section of a site, with the pages that use it. */
export async function listLibrary(siteId: string): Promise<LibraryItem[]> {
  const rows = await db
    .select({ section: sections, pageId: pages.id, pageTitle: pages.title })
    .from(sections)
    .leftJoin(pageSections, eq(pageSections.sectionId, sections.id))
    .leftJoin(pages, and(eq(pages.id, pageSections.pageId), isNull(pages.deletedAt)))
    .where(and(eq(sections.siteId, siteId), eq(sections.isShared, true)))
    .orderBy(asc(sections.libraryName), asc(pages.position));

  const items = new Map<string, LibraryItem>();
  for (const { section, pageId, pageTitle } of rows) {
    let item = items.get(section.id);
    if (!item) {
      const block = normalizeBlock({ ...section, isHidden: false });
      if (!block) continue;
      item = {
        name: section.libraryName ?? "Saved section",
        revision: section.revision,
        pages: [],
        block,
      };
      items.set(section.id, item);
    }
    if (pageId && pageTitle && !item.pages.some((page) => page.id === pageId)) {
      item.pages.push({ id: pageId, title: pageTitle });
    }
  }
  return [...items.values()];
}

/** Shared-section details for the editor, keyed by section id. */
export async function sharedInfoById(siteId: string): Promise<Record<string, SharedInfo>> {
  const library = await listLibrary(siteId);
  return Object.fromEntries(library.map(({ block, ...info }) => [block.id, info] as const));
}
