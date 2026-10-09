"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { navigationSchema } from "@/sections/navigation";
import { safeHref } from "@/sections/rich-text";
import { themeSchema } from "@/sections/theme";
import { type ActionResult, fail, NOT_FOUND, ok } from "@/server/action-result";
import { logActivity } from "@/server/activity";

import { findOwnedSite } from "./access";

/** Saves the draft theme. Visitors see it after the site design is published. */
export async function updateTheme(siteId: string, input: unknown): Promise<ActionResult> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);
  // The schema repairs invalid values, so a bad request can't store a broken theme.
  const theme = themeSchema.parse(input ?? {});

  await db.transaction(async (tx) => {
    await tx
      .update(sites)
      .set({ theme, designHasUnpublishedChanges: true })
      .where(eq(sites.id, site.id));
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "site.theme_changed",
      entityType: "site",
      entityId: site.id,
    });
  });
  refresh();
  return ok();
}

const navigationInput = z.object({
  links: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().trim().max(40),
        href: z.string().trim().max(2000),
      }),
    )
    .max(6),
  social: z.record(z.string(), z.string().trim().max(2000)),
});

/** Saves extra menu links and social profiles (draft). */
export async function updateNavigation(siteId: string, input: unknown): Promise<ActionResult> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  const parsed = navigationInput.safeParse(input);
  if (!parsed.success) return fail("Please check the links and try again.");

  const fieldErrors: Record<string, string> = {};
  parsed.data.links.forEach((link, index) => {
    if (!link.label && !link.href) return;
    if (!link.label) fieldErrors[`links.${index}.label`] = "Add the text people will see.";
    if (!safeHref(link.href))
      fieldErrors[`links.${index}.href`] = "Use a web address (https://…) or a page like /about.";
  });
  for (const [key, value] of Object.entries(parsed.data.social)) {
    if (value && !/^https?:\/\/\S+$/i.test(value))
      fieldErrors[`social.${key}`] = "Paste the full address, starting with https://";
  }
  if (Object.keys(fieldErrors).length > 0)
    return fail("Please fix the highlighted fields.", fieldErrors);

  const navigation = navigationSchema.parse({
    links: parsed.data.links.filter((link) => link.label || link.href),
    social: Object.fromEntries(Object.entries(parsed.data.social).filter(([, value]) => value)),
  });

  await db.transaction(async (tx) => {
    await tx
      .update(sites)
      .set({ navigation, designHasUnpublishedChanges: true })
      .where(eq(sites.id, site.id));
    await logActivity(tx, {
      siteId: site.id,
      userId: me.id,
      action: "site.menu_changed",
      entityType: "site",
      entityId: site.id,
    });
  });
  refresh();
  return ok();
}
