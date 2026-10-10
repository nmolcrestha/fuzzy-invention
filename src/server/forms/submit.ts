import "server-only";

import { createHash } from "node:crypto";

import { and, count, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { formSubmissions, pages, sites, user } from "@/db/schema";
import { env } from "@/env";
import { formSubmissionEmail, sendEmail } from "@/lib/email";
import { normalizeLivePath } from "@/lib/hosts";
import { type ContactFormData, HONEYPOT, replyAddress, validateSubmission } from "@/sections/form";
import { getLivePage, getLiveSite } from "@/server/live/queries";

/** At most this many messages per sender per site in the window… */
const PER_SENDER = { limit: 5, windowMs: 10 * 60 * 1000 };
/** …and this many per site, so one site can't be flooded. */
const PER_SITE = { limit: 100, windowMs: 60 * 60 * 1000 };

export type SubmitResult =
  | { ok: true; notify?: () => Promise<void> }
  | { ok: false; status: number; error: string; errors?: Record<string, string> };

const UNAVAILABLE: SubmitResult = {
  ok: false,
  status: 404,
  error: "This form isn't available any more. Refresh the page and try again.",
};

function hashIp(ip: string) {
  return createHash("sha256").update(`${env.BETTER_AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Handles a message sent through a contact form on a live site (requirements FRM-1, FRM-4).
 * Only forms on published pages accept messages, and fields are checked against the published
 * form, never against whatever the browser sends.
 */
export async function submitForm({
  subdomain,
  form,
  ip,
  pagePath,
}: {
  subdomain: string;
  form: globalThis.FormData;
  ip: string;
  pagePath: string;
}): Promise<SubmitResult> {
  const site = await getLiveSite(subdomain);
  if (!site) return UNAVAILABLE;
  const path = normalizeLivePath(pagePath);
  const page = await getLivePage(site.id, path);
  const sectionId = String(form.get("_section") ?? "");
  const block = page?.sections.find(
    (section) => section.id === sectionId && section.type === "form",
  );
  if (!page || !block) return UNAVAILABLE;

  // Bots fill in every field, including the hidden one. Pretend it worked.
  if (String(form.get(HONEYPOT) ?? "").trim()) return { ok: true };

  const data = block.data as ContactFormData;
  const result = validateSubmission(data.fields, (name) => {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
  });
  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      error: result.errors.form ?? "Please check the highlighted fields.",
      errors: result.errors,
    };
  }

  const ipHash = hashIp(ip);
  const now = Date.now();
  const [[fromSender], [toSite]] = await Promise.all([
    db
      .select({ total: count() })
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.siteId, site.id),
          eq(formSubmissions.ipHash, ipHash),
          gt(formSubmissions.createdAt, new Date(now - PER_SENDER.windowMs)),
        ),
      ),
    db
      .select({ total: count() })
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.siteId, site.id),
          gt(formSubmissions.createdAt, new Date(now - PER_SITE.windowMs)),
        ),
      ),
  ]);
  if ((fromSender?.total ?? 0) >= PER_SENDER.limit || (toSite?.total ?? 0) >= PER_SITE.limit) {
    return {
      ok: false,
      status: 429,
      error:
        "You've sent several messages in a short time. Please wait a few minutes and try again.",
    };
  }

  const [row] = await db
    .select({
      pageId: pages.id,
      ownerEmail: user.email,
      ownerName: user.name,
      settings: sites.settings,
    })
    .from(sites)
    .innerJoin(user, eq(sites.ownerId, user.id))
    .leftJoin(
      pages,
      and(eq(pages.siteId, sites.id), eq(pages.publishedPath, path), isNull(pages.deletedAt)),
    )
    .where(eq(sites.id, site.id))
    .limit(1);

  await db.insert(formSubmissions).values({
    siteId: site.id,
    pageId: row?.pageId ?? null,
    sectionId: block.id,
    pageTitle: page.title,
    data: { fields: result.fields },
    ipHash,
  });

  const notifyOwner = row && row.settings.formNotifications !== false;
  return {
    ok: true,
    notify: notifyOwner
      ? async () => {
          const email = formSubmissionEmail({
            siteId: site.id,
            siteName: site.snapshot.name,
            pageTitle: page.title,
            fields: result.fields,
          });
          await sendEmail({
            to: row.ownerEmail,
            subject: `New message from your website ${site.snapshot.name}`,
            replyTo: replyAddress(result.fields) ?? undefined,
            ...email,
          });
        }
      : undefined,
  };
}
