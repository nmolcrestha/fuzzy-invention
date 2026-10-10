"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";

import { isImageType, uploadPathname, uploadProblem } from "@/lib/media-rules";
import { recordBlobUpload } from "@/server/media/actions";
import type { MediaItem } from "@/server/media/queries";

export type UploadMode = "blob" | "local";

export type UploadItem = {
  id: string;
  name: string;
  /** 0–100 */
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

/** Pixel size of an image file, or nulls when the browser can't tell (e.g. some SVGs). */
async function imageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      width: image.naturalWidth > 0 ? image.naturalWidth : null,
      height: image.naturalHeight > 0 ? image.naturalHeight : null,
    };
  } catch {
    return { width: null, height: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadLocally(
  siteId: string,
  file: File,
  size: { width: number | null; height: number | null },
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("siteId", siteId);
    form.set("file", file);
    if (size.width) form.set("width", String(size.width));
    if (size.height) form.set("height", String(size.height));

    const request = new XMLHttpRequest();
    request.open("POST", "/api/media/local");
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      const body = request.response as (MediaItem & { error?: string }) | null;
      if (request.status >= 200 && request.status < 300 && body?.id) resolve(body);
      else reject(new Error(body?.error ?? "We couldn't upload that image. Please try again."));
    };
    request.onerror = () =>
      reject(new Error("The upload was interrupted. Check your connection and try again."));
    request.send(form);
  });
}

async function uploadToBlob(
  siteId: string,
  file: File,
  size: { width: number | null; height: number | null },
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  if (!isImageType(file.type)) throw new Error(uploadProblem(file) ?? "Unsupported file.");
  let blob;
  try {
    blob = await upload(uploadPathname(siteId, file.name, file.type), file, {
      access: "public",
      handleUploadUrl: "/api/media/upload",
      contentType: file.type,
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    });
  } catch {
    throw new Error("The upload didn't go through. Check your connection and try again.");
  }
  const result = await recordBlobUpload({ siteId, url: blob.url, fileName: file.name, ...size });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/**
 * Uploads images one after another with progress (requirement MED-1). Files are checked in the
 * browser first so people get a clear message right away; the server checks again.
 */
export function useUploads({
  siteId,
  mode,
  onUploaded,
}: {
  siteId: string;
  mode: UploadMode;
  onUploaded: (item: MediaItem, batchSize: number) => void;
}) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setUploads((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const queued = files.map((file) => ({ file, id: globalThis.crypto.randomUUID() }));
      setUploads((current) => [
        ...current.filter((item) => item.status === "uploading"),
        ...queued.map(({ file, id }) => {
          const problem = uploadProblem(file);
          return {
            id,
            name: file.name,
            progress: 0,
            status: problem ? ("error" as const) : ("uploading" as const),
            error: problem ?? undefined,
          };
        }),
      ]);

      const valid = queued.filter(({ file }) => !uploadProblem(file));
      for (const { file, id } of valid) {
        try {
          const size = await imageSize(file);
          const onProgress = (progress: number) => update(id, { progress });
          const item =
            mode === "blob"
              ? await uploadToBlob(siteId, file, size, onProgress)
              : await uploadLocally(siteId, file, size, onProgress);
          update(id, { status: "done", progress: 100 });
          onUploaded(item, valid.length);
        } catch (error) {
          update(id, {
            status: "error",
            error: error instanceof Error ? error.message : "The upload failed.",
          });
        }
      }
      // Finished uploads fade out of the list; errors stay until dismissed.
      setTimeout(
        () => setUploads((current) => current.filter((item) => item.status !== "done")),
        1500,
      );
    },
    [mode, onUploaded, siteId],
  );

  const dismiss = (id: string) => setUploads((current) => current.filter((item) => item.id !== id));

  return { uploads, uploadFiles, dismiss };
}
