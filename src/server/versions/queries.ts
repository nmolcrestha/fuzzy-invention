import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { pageVersions, siteVersions, user } from "@/db/schema";

export type VersionRow = {
  id: string;
  createdAt: string;
  note: string | null;
  publishedBy: string | null;
  /** What visitors see right now. */
  isLive: boolean;
  /** Short description of what's in it, e.g. "Pricing · 6 sections". */
  summary: string;
};

export async function listPageVersions(
  pageId: string,
  liveVersionId: string | null,
): Promise<VersionRow[]> {
  const rows = await db
    .select({
      id: pageVersions.id,
      createdAt: pageVersions.createdAt,
      note: pageVersions.note,
      snapshot: pageVersions.snapshot,
      publishedBy: user.name,
    })
    .from(pageVersions)
    .leftJoin(user, eq(pageVersions.publishedBy, user.id))
    .where(eq(pageVersions.pageId, pageId))
    .orderBy(desc(pageVersions.createdAt))
    .limit(50);
  return rows.map((row) => {
    const sections = Array.isArray(row.snapshot.sections) ? row.snapshot.sections.length : 0;
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      note: row.note,
      publishedBy: row.publishedBy,
      isLive: row.id === liveVersionId,
      summary: `${String(row.snapshot.title ?? "Untitled")} · ${String(row.snapshot.path ?? "/")} · ${sections === 1 ? "1 section" : `${sections} sections`}`,
    };
  });
}

export async function listSiteVersions(
  siteId: string,
  liveVersionId: string | null,
): Promise<VersionRow[]> {
  const rows = await db
    .select({
      id: siteVersions.id,
      createdAt: siteVersions.createdAt,
      note: siteVersions.note,
      snapshot: siteVersions.snapshot,
      publishedBy: user.name,
    })
    .from(siteVersions)
    .leftJoin(user, eq(siteVersions.publishedBy, user.id))
    .where(eq(siteVersions.siteId, siteId))
    .orderBy(desc(siteVersions.createdAt))
    .limit(50);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    note: row.note,
    publishedBy: row.publishedBy,
    isLive: row.id === liveVersionId,
    summary: `Colors, header, footer and menu of “${String(row.snapshot.name ?? "")}”`,
  }));
}

export async function findPageVersion(pageId: string, versionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return null;
  const [row] = await db
    .select()
    .from(pageVersions)
    .where(and(eq(pageVersions.id, versionId), eq(pageVersions.pageId, pageId)))
    .limit(1);
  return row ?? null;
}

export async function findSiteVersion(siteId: string, versionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return null;
  const [row] = await db
    .select()
    .from(siteVersions)
    .where(and(eq(siteVersions.id, versionId), eq(siteVersions.siteId, siteId)))
    .limit(1);
  return row ?? null;
}

/** A page version by id. Callers must check that the user owns its page. */
export async function findPageVersionById(versionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(versionId)) return null;
  const [row] = await db.select().from(pageVersions).where(eq(pageVersions.id, versionId)).limit(1);
  return row ?? null;
}
