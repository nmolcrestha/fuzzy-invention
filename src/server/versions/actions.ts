"use server";

import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { type ChromeBlock, type Page, pages, pageSections, sections, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import type { SectionBlock } from "@/sections/registry";
import { type PageSnapshot, parsePageSnapshot, parseSiteSnapshot } from "@/sections/snapshot";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { findOwnedPage, findOwnedSite } from "@/server/sites/access";

import { findPageVersion, findSiteVersion } from "./queries";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Replaces a page's draft sections with a published snapshot. Saved (shared) sections that still
 * exist are linked again, without changing their current content; everything else comes back as
 * new copies, so other pages are never affected.
 */
async function applyPageSnapshot(tx: Tx, page: Page, snapshot: PageSnapshot) {
  const placed = await tx
    .select({ sectionId: pageSections.sectionId })
    .from(pageSections)
    .where(eq(pageSections.pageId, page.id));
  const ids = snapshot.sections.map((block) => block.id);
  const shared = new Set(
    ids.length === 0
      ? []
      : (
          await tx
            .select({ id: sections.id })
            .from(sections)
            .where(
              and(
                eq(sections.siteId, page.siteId),
                eq(sections.isShared, true),
                inArray(sections.id, ids),
              ),
            )
        ).map((row) => row.id),
  );

  await tx.delete(pageSections).where(eq(pageSections.pageId, page.id));
  if (placed.length > 0) {
    await tx.delete(sections).where(
      and(
        inArray(
          sections.id,
          placed.map((row) => row.sectionId),
        ),
        eq(sections.isShared, false),
      ),
    );
  }

  const restored: (SectionBlock & { linked: boolean })[] = snapshot.sections.map((block) =>
    shared.has(block.id)
      ? { ...block, linked: true }
      : { ...block, id: globalThis.crypto.randomUUID(), linked: false },
  );
  const copies = restored.filter((block) => !block.linked);
  if (copies.length > 0) {
    await tx.insert(sections).values(
      copies.map((block) => ({
        id: block.id,
        siteId: page.siteId,
        type: block.type,
        variant: block.variant,
        schemaVersion: block.schemaVersion,
        data: block.data,
        style: block.style,
      })),
    );
  }
  if (restored.length > 0) {
    await tx.insert(pageSections).values(
      restored.map((block, position) => ({
        pageId: page.id,
        sectionId: block.id,
        position,
        isHidden: false,
      })),
    );
  }
}

const restorePageInput = z.object({ pageId: z.uuid(), versionId: z.uuid() });

/**
 * Restores an earlier version of a page to its draft (requirement PUB-8). Nothing changes on the
 * live website until the page is published again. The page keeps its current address.
 */
export async function restorePageVersion(
  input: z.input<typeof restorePageInput>,
): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = restorePageInput.safeParse(input);
  if (!parsed.success) return fail(NOT_FOUND);
  const found = await findOwnedPage(me.id, parsed.data.pageId);
  if (!found) return fail(NOT_FOUND);
  const version = await findPageVersion(found.page.id, parsed.data.versionId);
  if (!version) return fail(NOT_FOUND);
  const snapshot = parsePageSnapshot(version.snapshot);

  try {
    await db.transaction(async (tx) => {
      await applyPageSnapshot(tx, found.page, snapshot);
      await tx
        .update(pages)
        .set({
          title: snapshot.title || found.page.title,
          seo: snapshot.seo,
          hasUnpublishedChanges: true,
          // Open editors must reload rather than save their older copy over this.
          draftRevision: sql`${pages.draftRevision} + 1`,
        })
        .where(eq(pages.id, found.page.id));
      await logActivity(tx, {
        siteId: found.site.id,
        userId: me.id,
        action: "page.version_restored",
        entityType: "page",
        entityId: found.page.id,
        metadata: { title: snapshot.title || found.page.title, versionId: version.id },
      });
    });
  } catch (error) {
    console.error("restorePageVersion failed", error);
    return fail(UNEXPECTED);
  }
  refresh();
  return ok();
}

/**
 * Throws away a page's unpublished changes: the draft becomes the live version again
 * (requirement PUB-9), including its title, address and search settings.
 */
export async function discardPageChanges(
  pageId: string,
): Promise<ActionResult<{ addressKept: boolean }>> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  const liveVersionId = found?.page.publishedVersionId;
  if (!found || !liveVersionId) return fail(NOT_FOUND);
  const { page, site } = found;
  const version = await findPageVersion(page.id, liveVersionId);
  if (!version) return fail(NOT_FOUND);
  const snapshot = parsePageSnapshot(version.snapshot);
  const livePath = page.publishedPath ?? snapshot.path;

  try {
    const addressKept = await db.transaction(async (tx) => {
      // The live address may now belong to another page's draft, and the homepage stays at "/".
      const [taken] = await tx
        .select({ id: pages.id })
        .from(pages)
        .where(
          and(
            eq(pages.siteId, site.id),
            eq(pages.path, livePath),
            ne(pages.id, page.id),
            isNull(pages.deletedAt),
          ),
        )
        .limit(1);
      const canRevertPath = !taken && (page.isHome ? livePath === "/" : livePath !== "/");
      const path = canRevertPath ? livePath : page.path;

      await applyPageSnapshot(tx, page, snapshot);
      await tx
        .update(pages)
        .set({
          title: snapshot.title || page.title,
          path,
          seo: snapshot.seo,
          hasUnpublishedChanges: path !== livePath,
          draftRevision: sql`${pages.draftRevision} + 1`,
        })
        .where(eq(pages.id, page.id));
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "page.changes_discarded",
        entityType: "page",
        entityId: page.id,
        metadata: { title: snapshot.title || page.title },
      });
      return path !== livePath;
    });
    refresh();
    return ok({ addressKept });
  } catch (error) {
    console.error("discardPageChanges failed", error);
    return fail(UNEXPECTED);
  }
}

/** Writes a site-design snapshot back to the draft. Returns true when the menu also matches it. */
async function applySiteSnapshot(
  tx: Tx,
  site: NonNullable<Awaited<ReturnType<typeof findOwnedSite>>>,
  raw: Record<string, unknown>,
) {
  const snapshot = parseSiteSnapshot(raw);
  const stored = ({ type, variant, schemaVersion, data, style }: SectionBlock): ChromeBlock => ({
    type,
    variant,
    schemaVersion,
    data,
    style,
  });
  await tx
    .update(sites)
    .set({
      name: snapshot.name || site.name,
      theme: snapshot.theme,
      header: stored(snapshot.header),
      footer: stored(snapshot.footer),
      navigation: { links: snapshot.navigation.links, social: snapshot.navigation.social },
      settings: {
        ...site.settings,
        contactEmail: snapshot.contact.email ?? "",
        phone: snapshot.contact.phone ?? "",
        address: snapshot.contact.address ?? "",
        logo: snapshot.branding.logo,
        favicon: snapshot.branding.favicon,
        socialImage: snapshot.branding.socialImage,
      },
      designRevision: sql`${sites.designRevision} + 1`,
    })
    .where(eq(sites.id, site.id));

  // The menu's pages and order come from the page list, which isn't restored.
  const menu = await tx
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, site.id), eq(pages.showInNav, true), isNull(pages.deletedAt)))
    .orderBy(asc(pages.position), asc(pages.createdAt));
  return (
    menu.length === snapshot.navigation.pageIds.length &&
    menu.every((row, index) => row.id === snapshot.navigation.pageIds[index])
  );
}

const restoreSiteInput = z.object({ siteId: z.uuid(), versionId: z.uuid() });

/** Restores an earlier site design (colors, header, footer, menu links, logo) to the draft. */
export async function restoreSiteVersion(
  input: z.input<typeof restoreSiteInput>,
): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = restoreSiteInput.safeParse(input);
  if (!parsed.success) return fail(NOT_FOUND);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);
  const version = await findSiteVersion(site.id, parsed.data.versionId);
  if (!version) return fail(NOT_FOUND);

  try {
    await db.transaction(async (tx) => {
      await applySiteSnapshot(tx, site, version.snapshot);
      await tx
        .update(sites)
        .set({ designHasUnpublishedChanges: true })
        .where(eq(sites.id, site.id));
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "site.design_restored",
        entityType: "site",
        entityId: site.id,
        metadata: { versionId: version.id },
      });
    });
  } catch (error) {
    console.error("restoreSiteVersion failed", error);
    return fail(UNEXPECTED);
  }
  refresh();
  return ok();
}

/** Throws away unpublished site-design changes (requirement PUB-9). */
export async function discardDesignChanges(
  siteId: string,
): Promise<ActionResult<{ menuStillChanged: boolean }>> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site?.publishedVersionId) return fail(NOT_FOUND);
  const version = await findSiteVersion(site.id, site.publishedVersionId);
  if (!version) return fail(NOT_FOUND);

  try {
    const menuMatches = await db.transaction(async (tx) => {
      const matches = await applySiteSnapshot(tx, site, version.snapshot);
      await tx
        .update(sites)
        .set({ designHasUnpublishedChanges: !matches })
        .where(eq(sites.id, site.id));
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "site.design_discarded",
        entityType: "site",
        entityId: site.id,
      });
      return matches;
    });
    refresh();
    return ok({ menuStillChanged: !menuMatches });
  } catch (error) {
    console.error("discardDesignChanges failed", error);
    return fail(UNEXPECTED);
  }
}
