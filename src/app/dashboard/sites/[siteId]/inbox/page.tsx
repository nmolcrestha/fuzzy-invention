import { and, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";

import { Inbox } from "@/components/forms/inbox";
import { db } from "@/db";
import { pages, pageSections, sections } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { listSubmissions } from "@/server/forms/queries";
import { getMySiteOr404 } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/inbox">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Messages` };
}

export default async function SiteInboxPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/inbox">) {
  const { siteId } = await params;
  const [me, site] = await Promise.all([requireUser(), getMySiteOr404(siteId)]);
  const [messages, [form]] = await Promise.all([
    listSubmissions(site.id),
    db
      .select({ id: sections.id })
      .from(sections)
      .innerJoin(pageSections, eq(pageSections.sectionId, sections.id))
      .innerJoin(pages, and(eq(pages.id, pageSections.pageId), isNull(pages.deletedAt)))
      .where(and(eq(sections.siteId, site.id), eq(sections.type, "form")))
      .limit(1),
  ]);

  return (
    <Inbox
      siteId={site.id}
      initialMessages={messages}
      notificationsEnabled={site.settings.formNotifications !== false}
      ownerEmail={me.email}
      hasForm={Boolean(form)}
    />
  );
}
