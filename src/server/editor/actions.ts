"use server";

import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { activityLog, pages, pageSections, sections, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { normalizeBlock, type SectionBlock } from "@/sections/registry";
import {
  type ActionFailure,
  type ActionResult,
  fail,
  NOT_FOUND,
  ok,
  UNEXPECTED,
} from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { findOwnedPage } from "@/server/sites/access";

const blockInput = z.object({
  id: z.uuid(),
  type: z.string().max(40),
  variant: z.string().max(40),
  data: z.unknown(),
  style: z.unknown().optional(),
  isHidden: z.boolean().optional(),
  /** Set for shared sections: the revision the editor started from, and whether it was edited. */
  shared: z.object({ revision: z.number().int(), dirty: z.boolean() }).optional(),
});

const chromeInput = z.object({
  type: z.string().max(40),
  variant: z.string().max(40),
  data: z.unknown(),
  style: z.unknown().optional(),
});

const saveDraftInput = z.object({
  pageId: z.uuid(),
  page: z.object({ revision: z.number().int(), sections: z.array(blockInput).max(100) }).optional(),
  design: z
    .object({ revision: z.number().int(), header: chromeInput, footer: chromeInput })
    .optional(),
});

export type SaveDraftInput = z.input<typeof saveDraftInput>;

const CONFLICT: ActionFailure = {
  ok: false,
  code: "conflict",
  error:
    "This page was changed in another tab or window. Reload to get the latest version. Changes saved from the other tab are kept.",
};

/** Don't flood the activity feed: one "edited" entry per page per half hour. */
const EDIT_LOG_WINDOW_MS = 30 * 60 * 1000;

class Conflict extends Error {}
class SharedConflict extends Error {}

const SHARED_CONFLICT: ActionFailure = {
  ok: false,
  code: "conflict",
  error:
    "A shared section on this page was just changed from another page. Reload to get the latest version before editing it.",
};
class Invalid extends Error {}

/**
 * Autosave from the editor. Saves the page's full ordered section list and/or the site's
 * header & footer. Each part is guarded by a revision number so two tabs can't silently
 * overwrite each other.
 */
export async function saveDraft(input: SaveDraftInput): Promise<
  ActionResult<{
    pageRevision: number | null;
    designRevision: number | null;
    /** New revisions of shared sections whose content was saved. */
    sharedRevisions: Record<string, number>;
  }>
> {
  const me = await requireUser();
  const parsed = saveDraftInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const { pageId, page: pageInput, design } = parsed.data;

  const found = await findOwnedPage(me.id, pageId);
  if (!found) return fail(NOT_FOUND);
  const { page, site } = found;

  // Validate everything before touching the database.
  let blocks: SectionBlock[] = [];
  if (pageInput) {
    const normalized = pageInput.sections.map((block) => normalizeBlock(block));
    if (
      normalized.some((block) => block === null) ||
      normalized.some((b) => b!.type === "header" || b!.type === "footer")
    ) {
      return fail(
        "Some content couldn't be saved because it's in an unexpected format. Reload the editor and try again.",
      );
    }
    blocks = normalized as SectionBlock[];
    if (new Set(blocks.map((block) => block.id)).size !== blocks.length) return fail(UNEXPECTED);
  }
  const header = design && normalizeBlock({ ...design.header, id: "header" });
  const footer = design && normalizeBlock({ ...design.footer, id: "footer" });
  if (design && (header?.type !== "header" || footer?.type !== "footer")) return fail(UNEXPECTED);

  try {
    const result = await db.transaction(async (tx) => {
      let pageRevision: number | null = null;
      let designRevision: number | null = null;
      const sharedRevisions: Record<string, number> = {};

      if (pageInput) {
        const [updated] = await tx
          .update(pages)
          .set({ draftRevision: sql`${pages.draftRevision} + 1`, hasUnpublishedChanges: true })
          .where(and(eq(pages.id, page.id), eq(pages.draftRevision, pageInput.revision)))
          .returning({ revision: pages.draftRevision });
        if (!updated) throw new Conflict();
        pageRevision = updated.revision;

        const incomingIds = blocks.map((block) => block.id);
        const placed = await tx
          .select({ sectionId: pageSections.sectionId })
          .from(pageSections)
          .where(eq(pageSections.pageId, page.id));
        const placedIds = new Set(placed.map((row) => row.sectionId));

        // An id must be new, already on this page, or one of this site's saved sections (linked
        // from the library). Never let a save touch another page's or site's section by its id.
        const existing =
          incomingIds.length > 0
            ? await tx
                .select({
                  id: sections.id,
                  siteId: sections.siteId,
                  isShared: sections.isShared,
                  revision: sections.revision,
                })
                .from(sections)
                .where(inArray(sections.id, incomingIds))
            : [];
        if (
          existing.some(
            (row) => row.siteId !== site.id || (!placedIds.has(row.id) && !row.isShared),
          )
        ) {
          throw new Invalid();
        }
        const sharedRows = new Map(
          existing.filter((row) => row.isShared).map((row) => [row.id, row]),
        );
        const sharedInput = new Map(
          pageInput.sections.flatMap((block) => (block.shared ? [[block.id, block.shared]] : [])),
        );

        // Shared sections: only content edited here is written, and only if nobody saved a newer
        // version from another page in the meantime. Every other page using it now has changes.
        for (const block of blocks) {
          const row = sharedRows.get(block.id);
          const meta = sharedInput.get(block.id);
          if (!row || !meta?.dirty) continue;
          if (meta.revision !== row.revision) throw new SharedConflict();
          const [updated] = await tx
            .update(sections)
            .set({
              variant: block.variant,
              schemaVersion: block.schemaVersion,
              data: block.data,
              style: block.style,
              revision: sql`${sections.revision} + 1`,
            })
            .where(eq(sections.id, block.id))
            .returning({ revision: sections.revision });
          sharedRevisions[block.id] = updated!.revision;
          await tx
            .update(pages)
            .set({ hasUnpublishedChanges: true })
            .where(
              and(
                ne(pages.id, page.id),
                inArray(
                  pages.id,
                  tx
                    .select({ id: pageSections.pageId })
                    .from(pageSections)
                    .where(eq(pageSections.sectionId, block.id)),
                ),
              ),
            );
        }
        const localBlocks = blocks.filter((block) => !sharedRows.has(block.id));

        const removed = [...placedIds].filter((id) => !incomingIds.includes(id));
        await tx.delete(pageSections).where(eq(pageSections.pageId, page.id));
        if (removed.length > 0) {
          await tx
            .delete(sections)
            .where(and(inArray(sections.id, removed), eq(sections.isShared, false)));
        }

        if (localBlocks.length > 0) {
          await tx
            .insert(sections)
            .values(
              localBlocks.map((block) => ({
                id: block.id,
                siteId: site.id,
                type: block.type,
                variant: block.variant,
                schemaVersion: block.schemaVersion,
                data: block.data,
                style: block.style,
              })),
            )
            .onConflictDoUpdate({
              target: sections.id,
              set: {
                variant: sql`excluded.variant`,
                schemaVersion: sql`excluded.schema_version`,
                data: sql`excluded.data`,
                style: sql`excluded.style`,
                updatedAt: new Date(),
              },
              // Belt and braces: never update another site's row (or a shared one, see above).
              setWhere: and(eq(sections.siteId, site.id), eq(sections.isShared, false)),
            });
        }

        if (blocks.length > 0) {
          await tx.insert(pageSections).values(
            blocks.map((block, position) => ({
              pageId: page.id,
              sectionId: block.id,
              position,
              isHidden: block.isHidden,
            })),
          );
        }

        await logEditOncePerWindow(tx, {
          siteId: site.id,
          userId: me.id,
          action: "page.content_edited",
          entityType: "page",
          entityId: page.id,
          metadata: { title: page.title },
        });
      }

      if (design && header && footer) {
        const toStored = ({ type, variant, schemaVersion, data, style }: SectionBlock) => ({
          type,
          variant,
          schemaVersion,
          data,
          style,
        });
        const [updated] = await tx
          .update(sites)
          .set({
            header: toStored(header),
            footer: toStored(footer),
            designRevision: sql`${sites.designRevision} + 1`,
            designHasUnpublishedChanges: true,
          })
          .where(and(eq(sites.id, site.id), eq(sites.designRevision, design.revision)))
          .returning({ revision: sites.designRevision });
        if (!updated) throw new Conflict();
        designRevision = updated.revision;
        await logEditOncePerWindow(tx, {
          siteId: site.id,
          userId: me.id,
          action: "site.design_edited",
          entityType: "site",
          entityId: site.id,
        });
      } else {
        await tx.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, site.id));
      }

      return { pageRevision, designRevision, sharedRevisions };
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Conflict) return CONFLICT;
    if (error instanceof SharedConflict) return SHARED_CONFLICT;
    if (error instanceof Invalid) return fail(UNEXPECTED);
    console.error("saveDraft failed", error);
    return fail(UNEXPECTED);
  }
}

async function logEditOncePerWindow(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  entry: Parameters<typeof logActivity>[1],
) {
  const [recent] = await tx
    .select({ id: activityLog.id })
    .from(activityLog)
    .where(
      and(
        eq(activityLog.siteId, entry.siteId),
        eq(activityLog.entityId, entry.entityId ?? ""),
        eq(activityLog.action, entry.action),
        gt(activityLog.createdAt, new Date(Date.now() - EDIT_LOG_WINDOW_MS)),
      ),
    )
    .orderBy(desc(activityLog.createdAt))
    .limit(1);
  if (!recent) await logActivity(tx, entry);
}
