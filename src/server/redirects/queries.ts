import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { redirects } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listRedirects(siteId: string) {
  return db
    .select({ id: redirects.id, fromPath: redirects.fromPath, toPath: redirects.toPath })
    .from(redirects)
    .where(eq(redirects.siteId, siteId))
    .orderBy(asc(redirects.fromPath));
}

/**
 * Forwards visitors from `fromPath` to `toPath`. Older redirects that pointed at `fromPath` are
 * updated to go straight to `toPath`, so visitors never bounce through a chain or a loop.
 */
export async function addRedirect(tx: Tx, siteId: string, fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  await tx
    .update(redirects)
    .set({ toPath })
    .where(and(eq(redirects.siteId, siteId), eq(redirects.toPath, fromPath)));
  // Something lives at the target now, so a redirect away from it would be a loop.
  await tx
    .delete(redirects)
    .where(and(eq(redirects.siteId, siteId), eq(redirects.fromPath, toPath)));
  await tx
    .insert(redirects)
    .values({ siteId, fromPath, toPath })
    .onConflictDoUpdate({ target: [redirects.siteId, redirects.fromPath], set: { toPath } });
}

/** A page went live at these addresses, so redirects away from them no longer apply. */
export async function clearRedirectsFrom(tx: Tx, siteId: string, paths: string[]) {
  if (paths.length === 0) return;
  await tx
    .delete(redirects)
    .where(and(eq(redirects.siteId, siteId), inArray(redirects.fromPath, paths)));
}
