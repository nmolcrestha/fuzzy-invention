import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { formSubmissions, type SubmissionField } from "@/db/schema";

export type InboxMessage = {
  id: string;
  pageTitle: string;
  fields: SubmissionField[];
  isRead: boolean;
  createdAt: string;
};

export async function listSubmissions(siteId: string, limit = 200): Promise<InboxMessage[]> {
  const rows = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.siteId, siteId))
    .orderBy(desc(formSubmissions.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    pageTitle: row.pageTitle,
    fields: row.data.fields ?? [],
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Unread messages, for the badge on the Messages tab (requirement FRM-2). */
export const countUnread = cache(async (siteId: string) => {
  const [row] = await db
    .select({ total: count() })
    .from(formSubmissions)
    .where(and(eq(formSubmissions.siteId, siteId), eq(formSubmissions.isRead, false)));
  return row?.total ?? 0;
});

export async function findSiteSubmission(siteId: string, submissionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return null;
  const [row] = await db
    .select()
    .from(formSubmissions)
    .where(and(eq(formSubmissions.id, submissionId), eq(formSubmissions.siteId, siteId)))
    .limit(1);
  return row ?? null;
}
