"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { pages, pageVersions, sites, siteVersions } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { siteUrl } from "@/lib/site-url";
import { checkBlock, checkSections } from "@/sections/checks";
import { extraNavLinks, normalizeNavigation } from "@/sections/navigation";
import { chromeBlock } from "@/sections/registry";
import { type PageSnapshot, parseSiteSnapshot, type SiteSnapshot } from "@/sections/snapshot";
import { normalizeTheme, themeWarnings } from "@/sections/theme";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { loadPageSections } from "@/server/editor/queries";
import { invalidateLiveSite } from "@/server/live-cache";
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

  const [sitePages, liveVersion] = await Promise.all([
    db
      .select()
      .from(pages)
      .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
      .orderBy(asc(pages.position), asc(pages.createdAt)),
    site.publishedVersionId
      ? db.select().from(siteVersions).where(eq(siteVersions.id, site.publishedVersionId)).limit(1)
      : Promise.resolve([]),
  ]);
  const liveMenu = new Set(
    liveVersion[0] ? parseSiteSnapshot(liveVersion[0].snapshot).navigation.pageIds : [],
  );

  const items = await Promise.all(
    sitePages.map(async (page): Promise<PublishPageItem> => {
      const check = checkSections(await loadPageSections(page.id));
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
});

class PublishError extends Error {}

/** Publishes the chosen pages and/or the site design as new immutable versions. */
export async function publishChanges(
  input: z.input<typeof publishInput>,
): Promise<ActionResult<{ url: string; pageCount: number; design: boolean }>> {
  const me = await requireUser();
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const { siteId, pageIds, includeDesign } = parsed.data;

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
          .values({ pageId: page.id, siteId: site.id, snapshot, publishedBy: me.id })
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
        };
        const [version] = await tx
          .insert(siteVersions)
          .values({ siteId: site.id, snapshot, publishedBy: me.id })
          .returning({ id: siteVersions.id });
        await tx
          .update(sites)
          .set({
            publishedVersionId: version!.id,
            designHasUnpublishedChanges: false,
            status: "live",
          })
          .where(eq(sites.id, site.id));
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

/** Takes one page off the live website (it stays in the dashboard as a draft). */
export async function unpublishPage(pageId: string): Promise<ActionResult> {
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
