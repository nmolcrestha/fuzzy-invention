import "server-only";

import { and, asc, count, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { activityLog, pages, sites, user } from "@/db/schema";
import { requireUser } from "@/lib/session";

import { findOwnedSite } from "./access";

/** Sites in the bin are kept this long before they're removed for good. */
export const SITE_RETENTION_DAYS = 30;

export async function listMySites() {
  const me = await requireUser();
  return db
    .select({
      id: sites.id,
      name: sites.name,
      subdomain: sites.subdomain,
      status: sites.status,
      updatedAt: sites.updatedAt,
      pageCount: count(pages.id),
      changedPageCount:
        sql<number>`count(${pages.id}) filter (where ${pages.hasUnpublishedChanges})`.mapWith(
          Number,
        ),
    })
    .from(sites)
    .leftJoin(pages, and(eq(pages.siteId, sites.id), isNull(pages.deletedAt)))
    .where(and(eq(sites.ownerId, me.id), isNull(sites.deletedAt)))
    .groupBy(sites.id)
    .orderBy(desc(sites.updatedAt));
}

export async function listMyDeletedSites() {
  const me = await requireUser();
  const cutoff = new Date(Date.now() - SITE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({ id: sites.id, name: sites.name, deletedAt: sites.deletedAt })
    .from(sites)
    .where(and(eq(sites.ownerId, me.id), isNotNull(sites.deletedAt), gt(sites.deletedAt, cutoff)))
    .orderBy(desc(sites.deletedAt));
}

/** Loads a site the current user owns, or renders the 404 page. Deduplicated per request. */
export const getMySiteOr404 = cache(async (siteId: string) => {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) notFound();
  return site;
});

export async function listPages(siteId: string) {
  const site = await getMySiteOr404(siteId);
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
    .orderBy(asc(pages.position), asc(pages.createdAt));
}

export async function listActivity(siteId: string, limit = 50) {
  const site = await getMySiteOr404(siteId);
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      userId: activityLog.userId,
      userName: user.name,
    })
    .from(activityLog)
    .leftJoin(user, eq(activityLog.userId, user.id))
    .where(eq(activityLog.siteId, site.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
