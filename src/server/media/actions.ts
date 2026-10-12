"use server";

import { head } from "@vercel/blob";
import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { mediaAssets, pageVersions, siteVersions } from "@/db/schema";
import { env } from "@/env";
import { isImageType, isMediaType, keyBelongsToSite, maxBytesFor } from "@/lib/media-rules";
import { requireUser } from "@/lib/session";
import { type ActionResult, fail, NOT_FOUND, ok, UNEXPECTED } from "@/server/action-result";
import { logActivity } from "@/server/activity";
import { findOwnedSite } from "@/server/sites/access";

import {
  findOwnedAsset,
  getMediaUsage,
  listSiteMedia,
  type MediaItem,
  type MediaUsage,
  recordAsset,
  removeImageFromDrafts,
} from "./queries";
import { deleteStoredFile, uploadMode } from "./storage";

/** The site's images, for image pickers. */
export async function listMedia(
  siteId: string,
): Promise<ActionResult<{ items: MediaItem[]; uploadMode: "blob" | "local" }>> {
  const me = await requireUser();
  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);
  return ok({ items: await listSiteMedia(site.id), uploadMode });
}

const recordInput = z.object({
  siteId: z.uuid(),
  url: z.url({ protocol: /^https$/ }),
  fileName: z.string().min(1).max(200),
  width: z.number().int().positive().max(50_000).nullable(),
  height: z.number().int().positive().max(50_000).nullable(),
  /** Videos: a still frame uploaded next to the video. */
  posterUrl: z
    .url({ protocol: /^https$/ })
    .nullable()
    .optional(),
  durationSeconds: z.number().int().positive().max(86_400).nullable().optional(),
});

/**
 * Called by the browser after a direct upload to Vercel Blob finished. The file's details are
 * read back from Blob storage, so the browser can't claim a different size or type.
 */
export async function recordBlobUpload(
  input: z.input<typeof recordInput>,
): Promise<ActionResult<MediaItem>> {
  const me = await requireUser();
  const parsed = recordInput.safeParse(input);
  if (!parsed.success || uploadMode !== "blob") return fail(UNEXPECTED);
  const { siteId, url, fileName, width, height, posterUrl, durationSeconds } = parsed.data;

  const site = await findOwnedSite(me.id, siteId);
  if (!site) return fail(NOT_FOUND);

  try {
    const blob = await head(url, { token: env.BLOB_READ_WRITE_TOKEN });
    if (
      !keyBelongsToSite(blob.pathname, site.id) ||
      !isMediaType(blob.contentType) ||
      blob.size > maxBytesFor(blob.contentType)
    ) {
      return fail("That upload couldn't be added to your library.");
    }
    let poster: string | null = null;
    if (posterUrl && blob.contentType.startsWith("video/")) {
      const posterBlob = await head(posterUrl, { token: env.BLOB_READ_WRITE_TOKEN });
      if (keyBelongsToSite(posterBlob.pathname, site.id) && isImageType(posterBlob.contentType)) {
        poster = posterBlob.url;
      }
    }
    const item = await recordAsset({
      siteId: site.id,
      userId: me.id,
      storageKey: blob.pathname,
      url: blob.url,
      fileName,
      mimeType: blob.contentType,
      sizeBytes: blob.size,
      width,
      height,
      posterUrl: poster,
      durationSeconds: durationSeconds ?? null,
    });
    refresh();
    return ok(item);
  } catch (error) {
    console.error("recordBlobUpload failed", error);
    return fail("We couldn't finish the upload. Please try again.");
  }
}

const altInput = z.object({
  assetId: z.uuid(),
  alt: z.string().trim().max(200, "Keep the description under 200 characters."),
});

/** Saves the image description used when the image is picked from now on. */
export async function updateMediaAlt(input: z.input<typeof altInput>): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = altInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? UNEXPECTED);
  const found = await findOwnedAsset(me.id, parsed.data.assetId);
  if (!found) return fail(NOT_FOUND);

  await db
    .update(mediaAssets)
    .set({ alt: parsed.data.alt })
    .where(eq(mediaAssets.id, found.asset.id));
  refresh();
  return ok();
}

/** Where an image is used, so deleting it can say what will change. */
export async function checkMediaUsage(assetId: string): Promise<ActionResult<MediaUsage>> {
  const me = await requireUser();
  const found = await findOwnedAsset(me.id, assetId);
  if (!found) return fail(NOT_FOUND);
  return ok(await getMediaUsage(found.site, found.asset.url));
}

/**
 * Deletes an image from the library and removes it from every draft that uses it. The file itself
 * is kept while a live page (or a version that can be restored) still shows it.
 */
export async function deleteMedia(assetId: string): Promise<ActionResult<{ removedFrom: number }>> {
  const me = await requireUser();
  const found = await findOwnedAsset(me.id, assetId);
  if (!found) return fail(NOT_FOUND);
  const { asset, site } = found;

  try {
    const usage = await getMediaUsage(site, asset.url);
    await db.transaction(async (tx) => {
      await removeImageFromDrafts(tx, site, asset.url);
      await tx
        .update(mediaAssets)
        .set({ deletedAt: new Date() })
        .where(eq(mediaAssets.id, asset.id));
      await logActivity(tx, {
        siteId: site.id,
        userId: me.id,
        action: "media.deleted",
        entityType: "media",
        entityId: asset.id,
        metadata: { fileName: asset.fileName },
      });
    });

    // Only remove the file when nothing published can show it any more.
    const [stillPublished] = await db
      .select({ id: pageVersions.id })
      .from(pageVersions)
      .where(
        and(
          eq(pageVersions.siteId, site.id),
          sql`position(${asset.url} in ${pageVersions.snapshot}::text) > 0`,
        ),
      )
      .union(
        db
          .select({ id: siteVersions.id })
          .from(siteVersions)
          .where(
            and(
              eq(siteVersions.siteId, site.id),
              sql`position(${asset.url} in ${siteVersions.snapshot}::text) > 0`,
            ),
          ),
      )
      .limit(1);
    if (!stillPublished) {
      await deleteStoredFile(asset).catch((error) =>
        console.error("Couldn't delete the stored file", asset.storageKey, error),
      );
      if (asset.posterUrl) {
        await deleteStoredFile({
          storageKey: asset.storageKey.replace(/\.[a-z0-9]+$/i, "-poster.jpg"),
          url: asset.posterUrl,
        }).catch(() => undefined);
      }
    }

    refresh();
    return ok({ removedFrom: usage.places.length });
  } catch (error) {
    console.error("deleteMedia failed", error);
    return fail(UNEXPECTED);
  }
}
