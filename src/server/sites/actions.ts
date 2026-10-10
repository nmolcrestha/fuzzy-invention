"use server";

import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/db";
import { pages, pageSections, sections, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { subdomainProblem } from "@/lib/slug";
import type { SectionBlock } from "@/sections/registry";
import { normalizeTheme, THEME_PRESETS } from "@/sections/theme";
import { getTemplate } from "@/templates/definitions";
import { materializeBlank, materializeTemplate } from "@/templates/materialize";
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

import { invalidateLiveSite } from "@/server/live-cache";

import { findOwnedSite } from "./access";
import { SITE_RETENTION_DAYS } from "./queries";
import {
  type CreateSiteInput,
  createSiteSchema,
  type UpdateBrandingInput,
  updateBrandingSchema,
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
): Promise<ActionResult<{ siteId: string; homePageId: string }>> {
  const me = await requireUser();
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { name, kind, subdomain, tagline, templateId, preset } = parsed.data;

  const template = templateId ? getTemplate(templateId) : undefined;
  if (templateId && !template)
    return fail("That template isn't available any more. Please pick another one.");
  const presetTheme = preset ? THEME_PRESETS.find((item) => item.id === preset) : undefined;

  const site = template
    ? materializeTemplate(template, { name, tagline })
    : materializeBlank({ name, tagline }, preset ?? undefined);
  const theme = presetTheme
    ? normalizeTheme({ ...presetTheme.theme, preset: presetTheme.id })
    : site.theme;
  const toStored = ({ type, variant, schemaVersion, data, style }: SectionBlock) => ({
    type,
    variant,
    schemaVersion,
    data,
    style,
  });

  if (await isSubdomainTaken(subdomain))
    return fail(SUBDOMAIN_TAKEN, { subdomain: SUBDOMAIN_TAKEN });

  try {
    const { siteId, homePageId } = await db.transaction(async (tx) => {
      let homeId = "";
      const [created] = await tx
        .insert(sites)
        .values({
          ownerId: me.id,
          name,
          kind,
          subdomain,
          templateKey: template?.id ?? null,
          theme,
          header: toStored(site.header),
          footer: toStored(site.footer),
        })
        .returning({ id: sites.id });
      const newSiteId = created!.id;

      for (const [position, page] of site.pages.entries()) {
        const [row] = await tx
          .insert(pages)
          .values({
            siteId: newSiteId,
            title: page.title,
            path: page.path,
            isHome: page.isHome,
            showInNav: page.showInNav,
            position,
          })
          .returning({ id: pages.id });
        if (page.isHome) homeId = row!.id;
        if (page.blocks.length > 0) {
          await tx
            .insert(sections)
            .values(
              page.blocks.map((block) => ({ id: block.id, siteId: newSiteId, ...toStored(block) })),
            );
          await tx.insert(pageSections).values(
            page.blocks.map((block, index) => ({
              pageId: row!.id,
              sectionId: block.id,
              position: index,
            })),
          );
        }
      }

      await logActivity(tx, {
        siteId: newSiteId,
        userId: me.id,
        action: "site.created",
        entityType: "site",
        entityId: newSiteId,
        metadata: { name, template: template?.name ?? null, pages: site.pages.length },
      });
      return { siteId: newSiteId, homePageId: homeId };
    });

    return ok({ siteId, homePageId });
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
        .set({
          name,
          subdomain,
          settings: { ...site.settings, contactEmail, phone, address },
          // Name and contact details are part of the published site design.
          ...((name !== site.name ||
            contactEmail !== (site.settings.contactEmail ?? "") ||
            phone !== (site.settings.phone ?? "") ||
            address !== (site.settings.address ?? "")) && { designHasUnpublishedChanges: true }),
        })
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

  // The web address changes immediately for visitors.
  if (subdomain !== site.subdomain) invalidateLiveSite(site.id, [site.subdomain, subdomain]);
  refresh();
  return ok();
}

/** Logo, browser-tab icon and default social image. Part of the site design, so they need publishing. */
export async function updateBranding(input: UpdateBrandingInput): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = updateBrandingSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { siteId, logo, favicon, socialImage } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  const current = site.settings;
  const changed = [
    (logo.src !== (current.logo?.src ?? "") || logo.alt !== (current.logo?.alt ?? "")) && "logo",
    favicon !== (current.favicon ?? "") && "browser tab icon",
    socialImage !== (current.socialImage ?? "") && "social media image",
  ].filter((item): item is string => Boolean(item));
  if (changed.length === 0) return ok();

  await db.transaction(async (tx) => {
    await tx
      .update(sites)
      .set({
        settings: {
          ...current,
          logo: logo.src ? logo : undefined,
          favicon: favicon || undefined,
          socialImage: socialImage || undefined,
        },
        designHasUnpublishedChanges: true,
      })
      .where(eq(sites.id, site.id));
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "site.updated",
      entityType: "site",
      entityId: site.id,
      metadata: { changed },
    });
  });

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

  invalidateLiveSite(site.id, [site.subdomain]);
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

  invalidateLiveSite(site.id, [site.subdomain]);
  refresh();
  return ok();
}

/** Hides the getting-started checklist for this site. */
export async function dismissChecklist(siteId: string): Promise<ActionResult> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);
  await db
    .update(sites)
    .set({ settings: { ...site.settings, checklistDismissed: true } })
    .where(eq(sites.id, site.id));
  refresh();
  return ok();
}
