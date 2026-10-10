"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { pages, pageSections, sections } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { findOwnedPage, findOwnedSite } from "@/server/sites/access";

import { type LibraryItem, listLibrary } from "./queries";

const libraryName = z
  .string()
  .trim()
  .min(1, "Give the section a name.")
  .max(60, "Keep the name under 60 characters.");

/** Saved sections for the section picker. */
export async function getLibrary(siteId: string): Promise<ActionResult<LibraryItem[]>> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);
  return ok(await listLibrary(site.id));
}

const saveInput = z.object({ pageId: z.uuid(), sectionId: z.uuid(), name: libraryName });

/**
 * Saves a section on this page for reuse (requirement SEC-6). The section stays where it is and
 * becomes linked: adding it elsewhere with "Link" keeps every copy in sync.
 */
export async function saveToLibrary(
  input: z.input<typeof saveInput>,
): Promise<ActionResult<{ revision: number }>> {
  const me = await requireUser();
  const parsed = saveInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? UNEXPECTED);
  const { pageId, sectionId, name } = parsed.data;

  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);

  const [placed] = await db
    .select({ id: pageSections.id })
    .from(pageSections)
    .where(and(eq(pageSections.pageId, found.page.id), eq(pageSections.sectionId, sectionId)))
    .limit(1);
  if (!placed) {
    return fail("This section hasn't been saved yet. Wait a moment and try again.");
  }

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx
      .update(sections)
      .set({ isShared: true, libraryName: name })
      .where(and(eq(sections.id, sectionId), eq(sections.siteId, found.site.id)))
      .returning({ revision: sections.revision });
    await logActivity(tx, {
      siteId: found.site.id,
      userId: me.id,
      action: "section.saved_to_library",
      entityType: "section",
      entityId: sectionId,
      metadata: { name },
    });
    return rows;
  });
  if (!updated) return fail(NOT_FOUND);
  return ok({ revision: updated.revision });
}

const renameInput = z.object({ siteId: z.uuid(), sectionId: z.uuid(), name: libraryName });

export async function renameLibrarySection(
  input: z.input<typeof renameInput>,
): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = renameInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? UNEXPECTED);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  const rows = await db
    .update(sections)
    .set({ libraryName: parsed.data.name })
    .where(
      and(
        eq(sections.id, parsed.data.sectionId),
        eq(sections.siteId, site.id),
        eq(sections.isShared, true),
      ),
    )
    .returning({ id: sections.id });
  if (rows.length === 0) return fail(NOT_FOUND);
  return ok();
}

const removeInput = z.object({ siteId: z.uuid(), sectionId: z.uuid() });

/**
 * Removes a section from the saved sections. Pages keep their content: the first page keeps the
 * original, and every other page gets its own copy (so they're no longer linked).
 */
export async function removeFromLibrary(
  input: z.input<typeof removeInput>,
): Promise<ActionResult<{ pageCount: number }>> {
  const me = await requireUser();
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  try {
    const pageCount = await db.transaction(async (tx) => {
      const [section] = await tx
        .select()
        .from(sections)
        .where(
          and(
            eq(sections.id, parsed.data.sectionId),
            eq(sections.siteId, site.id),
            eq(sections.isShared, true),
          ),
        )
        .for("update")
        .limit(1);
      if (!section) return null;

      const placements = await tx
        .select({ id: pageSections.id, pageId: pageSections.pageId })
        .from(pageSections)
        .innerJoin(pages, eq(pages.id, pageSections.pageId))
        .where(eq(pageSections.sectionId, section.id))
        .orderBy(asc(pages.position));

      if (placements.length === 0) {
        await tx.delete(sections).where(eq(sections.id, section.id));
      } else {
        await tx
          .update(sections)
          .set({ isShared: false, libraryName: null })
          .where(eq(sections.id, section.id));
        for (const placement of placements.slice(1)) {
          const copyId = globalThis.crypto.randomUUID();
          await tx.insert(sections).values({
            id: copyId,
            siteId: site.id,
            type: section.type,
            variant: section.variant,
            schemaVersion: section.schemaVersion,
            data: section.data,
            style: section.style,
          });
          await tx
            .update(pageSections)
            .set({ sectionId: copyId })
            .where(eq(pageSections.id, placement.id));
        }
        // Open editors hold the old ids, so ask them to reload instead of saving over this.
        await tx
          .update(pages)
          .set({ draftRevision: sql`${pages.draftRevision} + 1` })
          .where(inArray(pages.id, [...new Set(placements.map((row) => row.pageId))]));
      }

      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "section.removed_from_library",
        entityType: "section",
        entityId: section.id,
        metadata: { name: section.libraryName },
      });
      return new Set(placements.map((row) => row.pageId)).size;
    });
    if (pageCount === null) return fail(NOT_FOUND);
    refresh();
    return ok({ pageCount });
  } catch (error) {
    console.error("removeFromLibrary failed", error);
    return fail(UNEXPECTED);
  }
}
