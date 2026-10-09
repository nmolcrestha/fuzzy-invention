"use server";

import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/db";
import { pages, pageSections, sections, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { subdomainProblem } from "@/lib/slug";
import { newSectionBlock } from "@/sections/registry";
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

import { findOwnedSite } from "./access";
import { SITE_RETENTION_DAYS } from "./queries";
import {
  type CreateSiteInput,
  createSiteSchema,
  type UpdateSiteInput,
  updateSiteSchema,
} from "./schemas";

const SUBDOMAIN_TAKEN =
  "That web address is already taken. Try adding your city or a word like “hq”.";

async function isSubdomainTaken(subdomain: string, exceptSiteId?: string) {
  const [row] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(
      exceptSiteId
        ? and(eq(sites.subdomain, subdomain), ne(sites.id, exceptSiteId))
        : eq(sites.subdomain, subdomain),
    )
    .limit(1);
  return Boolean(row);
}

/** Live availability check for the web-address field. */
export async function checkSubdomain(
  subdomain: string,
  exceptSiteId?: string,
): Promise<{ available: boolean; message: string | null }> {
  await requireUser();
  const value = subdomain.trim().toLowerCase();
  const problem = subdomainProblem(value);
  if (problem) return { available: false, message: problem };
  if (await isSubdomainTaken(value, exceptSiteId))
    return { available: false, message: SUBDOMAIN_TAKEN };
  return { available: true, message: null };
}

export async function createSite(
  input: CreateSiteInput,
): Promise<ActionResult<{ siteId: string }>> {
  const me = await requireUser();
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, kind, subdomain } = parsed.data;

  if (await isSubdomainTaken(subdomain))
    return fail(SUBDOMAIN_TAKEN, { subdomain: SUBDOMAIN_TAKEN });

  try {
    const siteId = await db.transaction(async (tx) => {
      const [site] = await tx
        .insert(sites)
        .values({ ownerId: me.id, name, kind, subdomain })
        .returning({ id: sites.id });

      const [home] = await tx
        .insert(pages)
        .values({ siteId: site!.id, title: "Home", path: "/", isHome: true, position: 0 })
        .returning({ id: pages.id });

      // Start the homepage with a hero so the editor never opens on a blank page.
      const hero = newSectionBlock("hero");
      await tx.insert(sections).values({
        id: hero.id,
        siteId: site!.id,
        type: hero.type,
        variant: hero.variant,
        schemaVersion: hero.schemaVersion,
        data: { ...hero.data, heading: `Welcome to ${name}` },
        style: hero.style,
      });
      await tx.insert(pageSections).values({ pageId: home!.id, sectionId: hero.id, position: 0 });

      await logActivity(tx, {
        siteId: site!.id,
        userId: me.id,
        action: "site.created",
        entityType: "site",
        entityId: site!.id,
        metadata: { name },
      });
      await logActivity(tx, {
        siteId: site!.id,
        userId: me.id,
        action: "page.created",
        entityType: "page",
        entityId: home!.id,
        metadata: { title: "Home" },
      });
      return site!.id;
    });

    return ok({ siteId });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(SUBDOMAIN_TAKEN, { subdomain: SUBDOMAIN_TAKEN });
    console.error("createSite failed", error);
    return fail(UNEXPECTED);
  }
}

export async function updateSite(input: UpdateSiteInput): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = updateSiteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { siteId, name, subdomain, contactEmail, phone, address } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  if (subdomain !== site.subdomain && (await isSubdomainTaken(subdomain, site.id))) {
    return fail(SUBDOMAIN_TAKEN, { subdomain: SUBDOMAIN_TAKEN });
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(sites)
        .set({ name, subdomain, settings: { ...site.settings, contactEmail, phone, address } })
        .where(eq(sites.id, site.id));

      const changed = [
        name !== site.name && "name",
        subdomain !== site.subdomain && "web address",
        (contactEmail !== (site.settings.contactEmail ?? "") ||
          phone !== (site.settings.phone ?? "") ||
          address !== (site.settings.address ?? "")) &&
          "contact details",
      ].filter(Boolean);

      if (changed.length > 0) {
        await logActivity(tx, {
          siteId: site.id,
          userId: me.id,
          action: "site.updated",
          entityType: "site",
          entityId: site.id,
          metadata: {
            changed,
            ...(subdomain !== site.subdomain && { from: site.subdomain, to: subdomain }),
          },
        });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail(SUBDOMAIN_TAKEN, { subdomain: SUBDOMAIN_TAKEN });
    console.error("updateSite failed", error);
    return fail(UNEXPECTED);
  }

  refresh();
  return ok();
}

/** Moves a site to the bin. It can be restored for SITE_RETENTION_DAYS. */
export async function deleteSite(siteId: string): Promise<ActionResult> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  await db.transaction(async (tx) => {
    await tx.update(sites).set({ deletedAt: new Date() }).where(eq(sites.id, site.id));
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "site.deleted",
      entityType: "site",
      entityId: site.id,
      metadata: { name: site.name },
    });
  });

  refresh();
  return ok();
}

export async function restoreSite(siteId: string): Promise<ActionResult> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId, { deleted: true });
  const cutoff = new Date(Date.now() - SITE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  if (!site || !site.deletedAt || site.deletedAt < cutoff) return fail(NOT_FOUND);

  await db.transaction(async (tx) => {
    await tx
      .update(sites)
      .set({ deletedAt: null })
      .where(and(eq(sites.id, site.id), isNotNull(sites.deletedAt), gt(sites.deletedAt, cutoff)));
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "site.restored",
      entityType: "site",
      entityId: site.id,
      metadata: { name: site.name },
    });
  });

  refresh();
  return ok();
}
