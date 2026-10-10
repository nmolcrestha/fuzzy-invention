"use server";

import { and, asc, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { pages, pageSections, pageVersions, sections, sites, siteVersions } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { siteUrl } from "@/lib/site-url";
import { checkBlock, checkSections } from "@/sections/checks";
import { extraNavLinks, normalizeNavigation } from "@/sections/navigation";
import { chromeBlock } from "@/sections/registry";
import { type PageSnapshot, parseSiteSnapshot, type SiteSnapshot } from "@/sections/snapshot";
import { seoProblems } from "@/sections/seo";
import { normalizeTheme, themeWarnings } from "@/sections/theme";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { loadPageSections } from "@/server/editor/queries";
import { invalidateLiveSite } from "@/server/live-cache";
import { addRedirect, clearRedirectsFrom } from "@/server/redirects/queries";
import { findOwnedPage, findOwnedSite } from "@/server/sites/access";

export type PublishPageItem = {
  id: string;
  title: string;
  path: string;
  livePath: string | null;
  state: "draft" | "changed" | "live";
  isHome: boolean;
  showInNav: boolean;
  inLiveMenu: boolean;
  problems: string[];
  internalLinks: string[];
  /** Shared sections on this page; pages that share one with the current page are pre-selected. */
  sharedSectionIds: string[];
};

export type PublishSummary = {
  site: { id: string; name: string; subdomain: string; url: string; isLive: boolean };
  pages: PublishPageItem[];
  design: {
    neverPublished: boolean;
    changed: boolean;
    problems: string[];
    internalLinks: string[];
  };
};

/** Everything the publish dialog needs: what changed, and what visitors would see. */
export async function getPublishSummary(siteId: string): Promise<ActionResult<PublishSummary>> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  const [sitePages, liveVersion, sharedPlacements] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
      .orderBy(asc(pages.position), asc(pages.createdAt)),
    site.publishedVersionId
      ? db.select().from(siteVersions).where(eq(siteVersions.id, site.publishedVersionId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ pageId: pageSections.pageId, sectionId: pageSections.sectionId })
      .from(pageSections)
      .innerJoin(sections, eq(sections.id, pageSections.sectionId))
      .where(and(eq(sections.siteId, site.id), eq(sections.isShared, true))),
  ]);
  const liveMenu = new Set(
    liveVersion[0] ? parseSiteSnapshot(liveVersion[0].snapshot).navigation.pageIds : [],
  );

  const items = await Promise.all(
    sitePages.map(async (page): Promise<PublishPageItem> => {
      const check = checkSections(await loadPageSections(page.id));
      check.problems.push(...seoProblems(page.seo));
      return {
        id: page.id,
        title: page.title,
        path: page.path,
        livePath: page.publishedVersionId ? page.publishedPath : null,
        state: !page.publishedVersionId ? "draft" : page.hasUnpublishedChanges ? "changed" : "live",
        isHome: page.isHome,
        showInNav: page.showInNav,
        inLiveMenu: liveMenu.has(page.id),
        problems: check.problems,
        internalLinks: check.internalLinks,
        sharedSectionIds: sharedPlacements
          .filter((row) => row.pageId === page.id)
          .map((row) => row.sectionId),
      };
    }),
  );

  const header = checkBlock(chromeBlock("header", site.header));
  const footer = checkBlock(chromeBlock("footer", site.footer));
  const navigation = normalizeNavigation(site.navigation);
  const navProblems = navigation.links
    .filter((link) => link.label.trim() && extraNavLinks([link]).length === 0)
    .map((link) => `Menu: the “${link.label}” link has an address that won't work.`);

  return ok({
    site: {
      id: site.id,
      name: site.name,
      subdomain: site.subdomain,
      url: siteUrl(site.subdomain),
      isLive: site.status === "live",
    },
    pages: items,
    design: {
      neverPublished: !site.publishedVersionId,
      changed: site.designHasUnpublishedChanges || !site.publishedVersionId,
      problems: [
        ...header.problems,
        ...footer.problems,
        ...navProblems,
        ...themeWarnings(normalizeTheme(site.theme)).map((warning) => `Design: ${warning}`),
      ],
      internalLinks: [...new Set([...header.internalLinks, ...footer.internalLinks])],
    },
  });
}

const publishInput = z.object({
  siteId: z.uuid(),
  pageIds: z.array(z.uuid()).max(500),
  includeDesign: z.boolean(),
  /** Moved pages whose old live address should forward visitors to the new one. */
  redirectPageIds: z.array(z.uuid()).max(500).optional().default([]),
  /** Optional note shown in version history. */
  note: z.string().trim().max(200).optional().default(""),
});

/** Versions kept per page (and for the site design). The live version is always kept. */
const VERSIONS_KEPT = 50;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function pruneVersions(tx: Tx, kind: "page" | "site", id: string) {
  const table = kind === "page" ? pageVersions : siteVersions;
  const owner = kind === "page" ? pageVersions.pageId : siteVersions.siteId;
  const keep = tx
    .select({ id: table.id })
    .from(table)
    .where(eq(owner, id))
    .orderBy(desc(table.createdAt))
    .limit(VERSIONS_KEPT);
  await tx.delete(table).where(and(eq(owner, id), notInArray(table.id, keep)));
}

class PublishError extends Error {}

/** Publishes the chosen pages and/or the site design as new immutable versions. */
export async function publishChanges(
  input: z.input<typeof publishInput>,
): Promise<ActionResult<{ url: string; pageCount: number; design: boolean }>> {
  const me = await requireUser();
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const { siteId, pageIds, includeDesign, redirectPageIds, note } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);
  if (pageIds.length === 0 && !includeDesign) return fail("Choose at least one thing to publish.");
  if (!site.publishedVersionId && !includeDesign) {
    return fail(
      "Your first publish needs to include the site design (header, footer, menu and colors).",
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the site row so two publishes can't interleave.
      await tx.execute(sql`select 1 from ${sites} where ${sites.id} = ${site.id} for update`);

      const allPages = await tx
        .select()
        .from(pages)
        .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
        .orderBy(asc(pages.position), asc(pages.createdAt));
      const chosen = allPages.filter((page) => pageIds.includes(page.id));
      if (chosen.length !== new Set(pageIds).size) {
        throw new PublishError("Some pages were deleted in the meantime. Refresh and try again.");
      }

      // Two live pages can't share an address. Pages not being published keep their live path.
      const finalPaths = new Map<string, string>();
      for (const page of allPages) {
        const path = pageIds.includes(page.id)
          ? page.path
          : page.publishedVersionId
            ? page.publishedPath
            : null;
        if (!path) continue;
        const clash = finalPaths.get(path);
        if (clash) {
          const other = allPages.find((candidate) => candidate.id === clash)!;
          const [stays, moving] = pageIds.includes(page.id) ? [other, page] : [page, other];
          throw new PublishError(
            `“${moving.title}” would go live at ${path}, but “${stays.title}” is still live there. ` +
              `Publish “${stays.title}” too (it has moved to ${stays.path}), or give one of them a different address.`,
          );
        }
        finalPaths.set(path, page.id);
      }

      // Old live addresses of moved pages forward to the new ones (unless something else lives there).
      await clearRedirectsFrom(tx, site.id, [...finalPaths.keys()]);
      for (const page of chosen) {
        const from = page.publishedVersionId ? page.publishedPath : null;
        if (
          from &&
          from !== page.path &&
          redirectPageIds.includes(page.id) &&
          !finalPaths.has(from)
        ) {
          await addRedirect(tx, site.id, from, page.path);
        }
      }

      const now = new Date();
      for (const page of chosen) {
        const sections = await loadPageSections(page.id);
        const snapshot: PageSnapshot = {
          title: page.title,
          path: page.path,
          isHome: page.isHome,
          seo: page.seo,
          sections: sections.filter((block) => !block.isHidden),
        };
        const [version] = await tx
          .insert(pageVersions)
          .values({
            pageId: page.id,
            siteId: site.id,
            snapshot,
            note: note || null,
            publishedBy: me.id,
          })
          .returning({ id: pageVersions.id });
        await tx
          .update(pages)
          .set({
            publishedVersionId: version!.id,
            publishedAt: now,
            publishedPath: page.path,
            // If someone saved new edits while we were publishing, keep the page marked as changed.
            hasUnpublishedChanges: sql`${pages.draftRevision} <> ${page.draftRevision}`,
          })
          .where(eq(pages.id, page.id));
        await pruneVersions(tx, "page", page.id);
      }

      if (includeDesign) {
        const navigation = normalizeNavigation(site.navigation);
        const snapshot: SiteSnapshot = {
          name: site.name,
          theme: normalizeTheme(site.theme),
          header: chromeBlock("header", site.header),
          footer: chromeBlock("footer", site.footer),
          navigation: {
            ...navigation,
            pageIds: allPages.filter((page) => page.showInNav).map((page) => page.id),
          },
          contact: {
            email: site.settings.contactEmail || undefined,
            phone: site.settings.phone || undefined,
            address: site.settings.address || undefined,
          },
          branding: {
            logo: site.settings.logo?.src ? site.settings.logo : undefined,
            favicon: site.settings.favicon || undefined,
            socialImage: site.settings.socialImage || undefined,
          },
        };
        const [version] = await tx
          .insert(siteVersions)
          .values({ siteId: site.id, snapshot, note: note || null, publishedBy: me.id })
          .returning({ id: siteVersions.id });
        await tx
          .update(sites)
          .set({
            publishedVersionId: version!.id,
            designHasUnpublishedChanges: false,
            status: "live",
          })
          .where(eq(sites.id, site.id));
        await pruneVersions(tx, "site", site.id);
      } else {
        await tx.update(sites).set({ status: "live", updatedAt: now }).where(eq(sites.id, site.id));
      }

      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "site.published",
        entityType: "site",
        entityId: site.id,
        metadata: { pages: chosen.map((page) => page.title), design: includeDesign },
      });

      return { pageCount: chosen.length };
    });

    invalidateLiveSite(site.id, [site.subdomain]);
    refresh();
    return ok({ url: siteUrl(site.subdomain), pageCount: result.pageCount, design: includeDesign });
  } catch (error) {
    if (error instanceof PublishError) return fail(error.message);
    console.error("publishChanges failed", error);
    return fail(UNEXPECTED);
  }
}

/**
 * Takes one page off the live website (it stays in the dashboard as a draft). With
 * `forwardToHome`, visitors of its address are sent to the homepage instead of a 404.
 */
export async function unpublishPage(pageId: string, forwardToHome = false): Promise<ActionResult> {
  const me = await requireUser();
  const row = await findOwnedPage(me.id, pageId);
  if (!row || !row.page.publishedVersionId) return fail(NOT_FOUND);
  if (row.page.isHome) {
    return fail(
      "The homepage can't be taken offline on its own. Make another page the homepage first.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(pages)
      .set({
        publishedVersionId: null,
        publishedPath: null,
        publishedAt: null,
        hasUnpublishedChanges: true,
      })
      .where(eq(pages.id, row.page.id));
    if (forwardToHome && row.page.publishedPath) {
      await addRedirect(tx, row.site.id, row.page.publishedPath, "/");
    }
    await logActivity(tx, {
      siteId: row.site.id,
      userId: me.id,
      action: "page.unpublished",
      entityType: "page",
      entityId: row.page.id,
      metadata: { title: row.page.title },
    });
  });

  invalidateLiveSite(row.site.id, [row.site.subdomain]);
  refresh();
  return ok();
}
