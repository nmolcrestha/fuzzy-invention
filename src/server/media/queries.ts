import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  type MediaAsset,
  mediaAssets,
  pages,
  pageSections,
  pageVersions,
  sections,
  type Site,
  sites,
  siteVersions,
} from "@/db/schema";
import { type MediaType, mediaKind } from "@/lib/media-rules";
import { usesImage, withoutImage } from "@/sections/media-refs";
import { getSectionDef } from "@/sections/registry";
import { logActivity } from "@/server/activity";
import { findOwnedSite } from "@/server/sites/access";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What the media library and image pickers show. Safe to send to the browser. */
export type MediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  posterUrl: string | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
};

export function toMediaItem(asset: MediaAsset): MediaItem {
  return {
    id: asset.id,
    kind: asset.kind,
    url: asset.url,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    posterUrl: asset.posterUrl,
    durationSeconds: asset.durationSeconds,
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
    createdAt: asset.createdAt.toISOString(),
  };
}

export async function listSiteMedia(siteId: string): Promise<MediaItem[]> {
  const rows = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.siteId, siteId), isNull(mediaAssets.deletedAt)))
    .orderBy(desc(mediaAssets.createdAt))
    .limit(500);
  return rows.map(toMediaItem);
}

/** An asset together with its site, only when `userId` owns the site. */
export async function findOwnedAsset(userId: string, assetId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return null;
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, assetId), isNull(mediaAssets.deletedAt)))
    .limit(1);
  if (!asset) return null;
  const site = await findOwnedSite(userId, asset.siteId);
  return site ? { asset, site } : null;
}

/** Records a finished upload. Idempotent: recording the same file twice returns the first record. */
export async function recordAsset(entry: {
  siteId: string;
  userId: string;
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: MediaType;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  posterUrl?: string | null;
  durationSeconds?: number | null;
}): Promise<MediaItem> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(mediaAssets)
      .values({
        siteId: entry.siteId,
        storageKey: entry.storageKey,
        url: entry.url,
        fileName: entry.fileName.slice(0, 200),
        kind: mediaKind(entry.mimeType),
        mimeType: entry.mimeType,
        sizeBytes: entry.sizeBytes,
        posterUrl: entry.posterUrl ?? null,
        durationSeconds: entry.durationSeconds ?? null,
        width: entry.width,
        height: entry.height,
        uploadedBy: entry.userId,
      })
      .onConflictDoNothing({ target: mediaAssets.storageKey })
      .returning();
    if (!created) {
      const [existing] = await tx
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.storageKey, entry.storageKey))
        .limit(1);
      return toMediaItem(existing!);
    }
    await logActivity(tx, {
      siteId: entry.siteId,
      userId: entry.userId,
      action: "media.uploaded",
      entityType: "media",
      entityId: created.id,
      metadata: { fileName: created.fileName },
    });
    return toMediaItem(created);
  });
}

export type MediaUsage = {
  /** Plain-language places, e.g. "Home › Hero" or "Logo". */
  places: string[];
  /** A live page or the live design still shows it, so the file is kept until republished. */
  inPublishedVersions: boolean;
};

const containsUrl = (column: unknown, url: string) => sql`position(${url} in ${column}::text) > 0`;

/** Where a site uses an image: in drafts (sections, SEO, site design) and in published versions. */
export async function getMediaUsage(site: Site, url: string): Promise<MediaUsage> {
  const [sectionRows, seoRows, [pagePublished], [designPublished]] = await Promise.all([
    db
      .select({
        type: sections.type,
        data: sections.data,
        isShared: sections.isShared,
        libraryName: sections.libraryName,
        pageTitle: pages.title,
      })
      .from(sections)
      .leftJoin(pageSections, eq(pageSections.sectionId, sections.id))
      .leftJoin(pages, and(eq(pages.id, pageSections.pageId), isNull(pages.deletedAt)))
      .where(and(eq(sections.siteId, site.id), containsUrl(sections.data, url))),
    db
      .select({ title: pages.title })
      .from(pages)
      .where(
        and(
          eq(pages.siteId, site.id),
          isNull(pages.deletedAt),
          sql`${pages.seo}->>'image' = ${url}`,
        ),
      ),
    db
      .select({ id: pageVersions.id })
      .from(pageVersions)
      .where(and(eq(pageVersions.siteId, site.id), containsUrl(pageVersions.snapshot, url)))
      .limit(1),
    db
      .select({ id: siteVersions.id })
      .from(siteVersions)
      .where(and(eq(siteVersions.siteId, site.id), containsUrl(siteVersions.snapshot, url)))
      .limit(1),
  ]);

  const places: string[] = [];
  for (const row of sectionRows) {
    if (!usesImage(row.data, url)) continue;
    const name = getSectionDef(row.type)?.name ?? "Section";
    if (row.pageTitle) places.push(`${row.pageTitle} › ${name}`);
    else if (row.isShared) places.push(`Saved section “${row.libraryName ?? name}”`);
  }
  for (const row of seoRows) places.push(`${row.title} › Social image`);
  if (usesImage(site.header, url)) places.push("Header");
  if (usesImage(site.footer, url)) places.push("Footer");
  if (site.settings.logo?.src === url) places.push("Logo");
  if (site.settings.favicon === url) places.push("Browser tab icon");
  if (site.settings.socialImage === url) places.push("Default social image");

  return {
    places: [...new Set(places)],
    inPublishedVersions: Boolean(pagePublished || designPublished),
  };
}

/**
 * Removes an image from every draft that uses it. Affected pages (and the site design) are marked
 * as changed; their revisions are bumped so an open editor reloads instead of saving the old image.
 */
export async function removeImageFromDrafts(tx: Tx, site: Site, url: string) {
  const affected = await tx
    .select({ id: sections.id, data: sections.data, isShared: sections.isShared })
    .from(sections)
    .where(and(eq(sections.siteId, site.id), containsUrl(sections.data, url)));

  const changedIds: string[] = [];
  for (const row of affected) {
    const data = withoutImage(row.data, url);
    if (data === row.data) continue;
    changedIds.push(row.id);
    await tx
      .update(sections)
      .set({ data, ...(row.isShared && { revision: sql`${sections.revision} + 1` }) })
      .where(eq(sections.id, row.id));
  }
  if (changedIds.length > 0) {
    const placements = await tx
      .select({ pageId: pageSections.pageId })
      .from(pageSections)
      .where(inArray(pageSections.sectionId, changedIds));
    const pageIds = [...new Set(placements.map((row) => row.pageId))];
    if (pageIds.length > 0) {
      await tx
        .update(pages)
        .set({ hasUnpublishedChanges: true, draftRevision: sql`${pages.draftRevision} + 1` })
        .where(inArray(pages.id, pageIds));
    }
  }

  await tx
    .update(pages)
    .set({ seo: sql`${pages.seo} - 'image'`, hasUnpublishedChanges: true })
    .where(and(eq(pages.siteId, site.id), sql`${pages.seo}->>'image' = ${url}`));

  const header = site.header && withoutImage(site.header, url);
  const footer = site.footer && withoutImage(site.footer, url);
  const settings = withoutImage(site.settings, url);
  const chromeChanged = header !== site.header || footer !== site.footer;
  if (chromeChanged || settings !== site.settings) {
    await tx
      .update(sites)
      .set({
        header,
        footer,
        settings: settings.logo?.src === "" ? { ...settings, logo: undefined } : settings,
        designHasUnpublishedChanges: true,
        ...(chromeChanged && { designRevision: sql`${sites.designRevision} + 1` }),
      })
      .where(eq(sites.id, site.id));
  }
}
