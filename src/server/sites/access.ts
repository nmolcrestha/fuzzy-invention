import "server-only";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { pages, sites } from "@/db/schema";

const uuid = z.uuid();

/**
 * Central authorization check (requirement §15): every read and write of a site goes through here.
 * Returns the site only when `userId` owns it. Later phases extend this to team members.
 */
export async function findOwnedSite(
  userId: string,
  siteId: string,
  { deleted = false }: { deleted?: boolean } = {},
) {
  if (!uuid.safeParse(siteId).success) return null;
  const [site] = await db
    .select()
    .from(sites)
    .where(
      and(
        eq(sites.id, siteId),
        eq(sites.ownerId, userId),
        deleted ? isNotNull(sites.deletedAt) : isNull(sites.deletedAt),
      ),
    )
    .limit(1);
  return site ?? null;
}

/** Returns a page together with its site, only when `userId` owns the (non-deleted) site. */
export async function findOwnedPage(
  userId: string,
  pageId: string,
  { deleted = false }: { deleted?: boolean } = {},
) {
  if (!uuid.safeParse(pageId).success) return null;
  const [row] = await db
    .select({ page: pages, site: sites })
    .from(pages)
    .innerJoin(sites, eq(pages.siteId, sites.id))
    .where(
      and(
        eq(pages.id, pageId),
        eq(sites.ownerId, userId),
        isNull(sites.deletedAt),
        deleted ? isNotNull(pages.deletedAt) : isNull(pages.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
