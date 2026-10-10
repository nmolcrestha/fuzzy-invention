"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { redirects } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, NOT_FOUND, ok } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { invalidateLiveSite } from "@/server/live-cache";
import { findOwnedSite } from "@/server/sites/access";

const input = z.object({ siteId: z.uuid(), redirectId: z.uuid() });

/** Stops forwarding an old address. Visitors to it will see "page not found" again. */
export async function deleteRedirect(raw: z.input<typeof input>): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail(NOT_FOUND);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx
      .delete(redirects)
      .where(and(eq(redirects.id, parsed.data.redirectId), eq(redirects.siteId, site.id)))
      .returning();
    if (row) {
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "redirect.deleted",
        entityType: "site",
        entityId: site.id,
        metadata: { fromPath: row.fromPath, toPath: row.toPath },
      });
    }
    return row;
  });
  if (!deleted) return fail(NOT_FOUND);

  invalidateLiveSite(site.id);
  refresh();
  return ok();
}
