"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { formSubmissions, sites } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { findOwnedSite } from "@/server/sites/access";

const markInput = z.object({
  siteId: z.uuid(),
  submissionIds: z.array(z.uuid()).min(1).max(500),
  isRead: z.boolean(),
});

export async function markSubmissions(input: z.input<typeof markInput>): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = markInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  await db
    .update(formSubmissions)
    .set({ isRead: parsed.data.isRead })
    .where(
      and(
        eq(formSubmissions.siteId, site.id),
        inArray(formSubmissions.id, parsed.data.submissionIds),
      ),
    );
  refresh();
  return ok();
}

const deleteInput = z.object({ siteId: z.uuid(), submissionId: z.uuid() });

export async function deleteSubmission(input: z.input<typeof deleteInput>): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = deleteInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  const deleted = await db
    .delete(formSubmissions)
    .where(
      and(eq(formSubmissions.siteId, site.id), eq(formSubmissions.id, parsed.data.submissionId)),
    )
    .returning({ id: formSubmissions.id });
  if (deleted.length === 0) return fail(NOT_FOUND);
  refresh();
  return ok();
}

const notifyInput = z.object({ siteId: z.uuid(), enabled: z.boolean() });

/** Turns the "new message" emails on or off (requirement FRM-3). */
export async function setFormNotifications(
  input: z.input<typeof notifyInput>,
): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = notifyInput.safeParse(input);
  if (!parsed.success) return fail(UNEXPECTED);
  const site = await findOwnedSite(me.id, parsed.data.siteId);
  if (!site) return fail(NOT_FOUND);

  await db
    .update(sites)
    .set({ settings: { ...site.settings, formNotifications: parsed.data.enabled } })
    .where(eq(sites.id, site.id));
  refresh();
  return ok();
}
