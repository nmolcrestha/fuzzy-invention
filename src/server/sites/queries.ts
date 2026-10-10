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
        sql<number>`count(${pages.id}) filter (where ${pages.hasUnpublishedChanges} or ${pages.publishedVersionId} is null)`.mapWith(
          Number,
        ),
      designChanged: sites.designHasUnpublishedChanges,
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

export const listPages = cache(async (siteId: string) => {
  const site = await getMySiteOr404(siteId);
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.siteId, site.id), isNull(pages.deletedAt)))
    .orderBy(asc(pages.position), asc(pages.createdAt));
});

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

export type ChecklistItem = {
  id: "homepage" | "contact" | "publish";
  label: string;
  hint: string;
  done: boolean;
};

/** Getting-started steps (requirement ONB-5), worked out from what the site already has. */
export const getChecklist = cache(async (siteId: string) => {
  const site = await getMySiteOr404(siteId);
  if (site.settings.checklistDismissed) return null;

  const [[edited], [home]] = await Promise.all([
    db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.siteId, site.id), eq(activityLog.action, "page.content_edited")))
      .limit(1),
    db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.siteId, site.id), eq(pages.isHome, true), isNull(pages.deletedAt)))
      .limit(1),
  ]);

  const items: ChecklistItem[] = [
    {
      id: "homepage",
      label: "Make the homepage yours",
      hint: "Change the headline and text to describe your business.",
      done: Boolean(edited),
    },
    {
      id: "contact",
      label: "Add your contact details",
      hint: "Your email, phone and address appear in the footer and contact sections.",
      done: Boolean(site.settings.contactEmail || site.settings.phone || site.settings.address),
    },
    {
      id: "publish",
      label: "Publish your website",
      hint: "Put it online so people can visit it.",
      done: site.status === "live",
    },
  ];
  return { items, homePageId: home?.id ?? null };
});
