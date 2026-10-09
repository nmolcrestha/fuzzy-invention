"use server";

import { and, eq, gt, isNull, max, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/db";
import { pages, type Page, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { pathFromTitle, uniqueVariant } from "@/lib/slug";
import { logActivity } from "@/server/activity";
import {
  type ActionResult,
  fail,
  fromZodError,
  isUniqueViolation,
  NOT_FOUND,
  ok,
  UNEXPECTED,
} from "@/server/action-result";
import { findOwnedPage, findOwnedSite } from "@/server/sites/access";
import {
  type CreatePageInput,
  createPageSchema,
  reorderPagesSchema,
  type UpdatePageInput,
  updatePageSchema,
} from "@/server/sites/schemas";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PATH_TAKEN = "Another page already uses this address. Choose a different one.";

async function takenPaths(tx: Tx | typeof db, siteId: string, exceptPageId?: string) {
  const rows = await tx
    .select({ path: pages.path })
    .from(pages)
    .where(
      and(
        eq(pages.siteId, siteId),
        isNull(pages.deletedAt),
        exceptPageId ? ne(pages.id, exceptPageId) : undefined,
      ),
    );
  return new Set(rows.map((row) => row.path));
}

/** Any change to a page means the site has something new to publish. */
async function touchSite(tx: Tx, siteId: string) {
  await tx.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, siteId));
}

export async function createPage(input: CreatePageInput): Promise<ActionResult<{ page: Page }>> {
  const me = await requireUser();
  const parsed = createPageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { siteId, title, path: requestedPath, showInNav } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  try {
    const page = await db.transaction(async (tx) => {
      const taken = await takenPaths(tx, site.id);
      let path: string;
      if (requestedPath) {
        if (taken.has(requestedPath)) return null;
        path = requestedPath;
      } else {
        path = uniqueVariant(pathFromTitle(title), (candidate) => taken.has(candidate));
      }

      const [{ maxPosition } = { maxPosition: null }] = await tx
        .select({ maxPosition: max(pages.position) })
        .from(pages)
        .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)));

      const [created] = await tx
        .insert(pages)
        .values({ siteId: site.id, title, path, showInNav, position: (maxPosition ?? -1) + 1 })
        .returning();

      await touchSite(tx, site.id);
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "page.created",
        entityType: "page",
        entityId: created!.id,
        metadata: { title },
      });
      return created!;
    });

    if (!page) return fail(PATH_TAKEN, { path: PATH_TAKEN });
    refresh();
    return ok({ page });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(PATH_TAKEN, { path: PATH_TAKEN });
    console.error("createPage failed", error);
    return fail(UNEXPECTED);
  }
}

export async function updatePage(input: UpdatePageInput): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = updatePageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { pageId, title, path } = parsed.data;

  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page } = found;

  if (page.isHome && path !== "/") {
    return fail(
      "The homepage always lives at “/”. To change that, make another page the homepage first.",
      {
        path: "The homepage always lives at “/”.",
      },
    );
  }
  if (!page.isHome && path === "/") {
    return fail("“/” is the homepage address. Use “Set as homepage” instead.", {
      path: "“/” is reserved for the homepage.",
    });
  }
  if (title === page.title && path === page.path) return ok();

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(pages)
        .set({ title, path, hasUnpublishedChanges: true })
        .where(eq(pages.id, page.id));
      await touchSite(tx, page.siteId);
      await logActivity(tx, {
        siteId: page.siteId,
        userId: me.id,
        action: "page.updated",
        entityType: "page",
        entityId: page.id,
        metadata: {
          title,
          ...(title !== page.title && { fromTitle: page.title }),
          ...(path !== page.path && { fromPath: page.path, toPath: path }),
        },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(PATH_TAKEN, { path: PATH_TAKEN });
    console.error("updatePage failed", error);
    return fail(UNEXPECTED);
  }

  refresh();
  return ok();
}

/**
 * Makes a page the homepage. The homepage always lives at "/", so the previous homepage
 * moves to an address based on its title. The new address is returned so the UI can say so.
 */
export async function setHomePage(
  pageId: string,
): Promise<ActionResult<{ previousHomePath: string | null }>> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page } = found;
  if (page.isHome) return ok({ previousHomePath: null });

  try {
    const previousHomePath = await db.transaction(async (tx) => {
      const [oldHome] = await tx
        .select()
        .from(pages)
        .where(and(eq(pages.siteId, page.siteId), eq(pages.isHome, true), isNull(pages.deletedAt)))
        .limit(1);

      let movedTo: string | null = null;
      if (oldHome) {
        const taken = await takenPaths(tx, page.siteId, oldHome.id);
        movedTo = uniqueVariant(pathFromTitle(oldHome.title), (candidate) => taken.has(candidate));
        await tx
          .update(pages)
          .set({ isHome: false, path: movedTo, hasUnpublishedChanges: true })
          .where(eq(pages.id, oldHome.id));
      }

      await tx
        .update(pages)
        .set({ isHome: true, path: "/", hasUnpublishedChanges: true })
        .where(eq(pages.id, page.id));
      await touchSite(tx, page.siteId);
      await logActivity(tx, {
        siteId: page.siteId,
        userId: me.id,
        action: "page.set_home",
        entityType: "page",
        entityId: page.id,
        metadata: { title: page.title, previousHome: oldHome?.title, previousHomeMovedTo: movedTo },
      });
      return movedTo;
    });

    refresh();
    return ok({ previousHomePath });
  } catch (error) {
    console.error("setHomePage failed", error);
    return fail(UNEXPECTED);
  }
}

export async function setPageInNav(pageId: string, showInNav: boolean): Promise<ActionResult> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page } = found;
  if (page.showInNav === showInNav) return ok();

  await db.transaction(async (tx) => {
    await tx
      .update(pages)
      .set({ showInNav, hasUnpublishedChanges: true })
      .where(eq(pages.id, page.id));
    await touchSite(tx, page.siteId);
    await logActivity(tx, {
      siteId: page.siteId,
      userId: me.id,
      action: "page.nav_changed",
      entityType: "page",
      entityId: page.id,
      metadata: { title: page.title, showInNav },
    });
  });

  refresh();
  return ok();
}

export async function reorderPages(input: {
  siteId: string;
  pageIds: string[];
}): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = reorderPagesSchema.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const { siteId, pageIds } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  const current = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)));
  const currentIds = new Set(current.map((row) => row.id));
  const sameSet = pageIds.length === currentIds.size && pageIds.every((id) => currentIds.has(id));
  if (!sameSet) {
    return fail("Your pages changed in the meantime. Refresh the page and try again.");
  }

  await db.transaction(async (tx) => {
    // One statement: position = index in the submitted order.
    await tx.execute(sql`
      update ${pages} set position = ordered.idx - 1, updated_at = now()
      from unnest(array[${sql.join(
        pageIds.map((id) => sql`${id}`),
        sql`, `,
      )}]::uuid[]) with ordinality as ordered(id, idx)
      where ${pages.id} = ordered.id and ${pages.siteId} = ${site.id}
    `);
    await touchSite(tx, site.id);
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "pages.reordered",
      entityType: "site",
      entityId: site.id,
    });
  });

  refresh();
  return ok();
}

export async function duplicatePage(pageId: string): Promise<ActionResult<{ page: Page }>> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page } = found;

  try {
    const copy = await db.transaction(async (tx) => {
      const taken = await takenPaths(tx, page.siteId);
      const base = page.isHome ? pathFromTitle(page.title) : page.path;
      const path = uniqueVariant(`${base}-copy`, (candidate) => taken.has(candidate));

      // Make room right after the original.
      await tx
        .update(pages)
        .set({ position: sql`${pages.position} + 1` })
        .where(
          and(
            eq(pages.siteId, page.siteId),
            gt(pages.position, page.position),
            isNull(pages.deletedAt),
          ),
        );

      const [created] = await tx
        .insert(pages)
        .values({
          siteId: page.siteId,
          title: `Copy of ${page.title}`.slice(0, 80),
          path,
          showInNav: false, // don't surprise visitors with a duplicate menu item
          position: page.position + 1,
          seo: page.seo,
        })
        .returning();
      // Sections are copied here too once they exist (Phase 2).

      await touchSite(tx, page.siteId);
      await logActivity(tx, {
        siteId: page.siteId,
        userId: me.id,
        action: "page.duplicated",
        entityType: "page",
        entityId: created!.id,
        metadata: { title: created!.title, sourceTitle: page.title },
      });
      return created!;
    });

    refresh();
    return ok({ page: copy });
  } catch (error) {
    console.error("duplicatePage failed", error);
    return fail(UNEXPECTED);
  }
}

/** Soft-deletes a page so it can be restored with Undo. */
export async function deletePage(pageId: string): Promise<ActionResult> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page } = found;

  if (page.isHome) {
    return fail(
      "This is your homepage, so it can't be deleted. Make another page the homepage first.",
    );
  }

  await db.transaction(async (tx) => {
    await tx.update(pages).set({ deletedAt: new Date() }).where(eq(pages.id, page.id));
    await touchSite(tx, page.siteId);
    await logActivity(tx, {
      siteId: page.siteId,
      userId: me.id,
      action: "page.deleted",
      entityType: "page",
      entityId: page.id,
      metadata: { title: page.title },
    });
  });

  refresh();
  return ok();
}

/** Undo for deletePage. If the address was reused meanwhile, the page gets a new one. */
export async function restorePage(
  pageId: string,
): Promise<ActionResult<{ path: string; pathChanged: boolean }>> {
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId, { deleted: true });
  if (!found) return fail(NOT_FOUND);
  const { page } = found;

  try {
    const path = await db.transaction(async (tx) => {
      const taken = await takenPaths(tx, page.siteId);
      const restoredPath = uniqueVariant(page.path, (candidate) => taken.has(candidate));
      await tx
        .update(pages)
        .set({ deletedAt: null, path: restoredPath, hasUnpublishedChanges: true })
        .where(eq(pages.id, page.id));
      await touchSite(tx, page.siteId);
      await logActivity(tx, {
        siteId: page.siteId,
        userId: me.id,
        action: "page.restored",
        entityType: "page",
        entityId: page.id,
        metadata: { title: page.title },
      });
      return restoredPath;
    });

    refresh();
    return ok({ path, pathChanged: path !== page.path });
  } catch (error) {
    console.error("restorePage failed", error);
    return fail(UNEXPECTED);
  }
}
