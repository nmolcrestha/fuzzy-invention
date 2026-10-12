"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";

import {
  type Accept,
  isMediaType,
  isVideoType,
  uploadPathname,
  uploadProblem,
} from "@/lib/media-rules";
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

type Details = {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  /** Videos: a still frame (JPEG) taken from the video. */
  poster: Blob | null;
};

const positive = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : null;

/** Pixel size of an image file, or nulls when the browser can't tell (e.g. some SVGs). */
async function imageDetails(file: File): Promise<Details> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      width: positive(image.naturalWidth),
      height: positive(image.naturalHeight),
      durationSeconds: null,
      poster: null,
    };
  } catch {
    return { width: null, height: null, durationSeconds: null, poster: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Size, length and a still frame (about a second in) of a video file. */
async function videoDetails(file: File): Promise<Details> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("unreadable"));
      }),
      8000,
    );
    const duration = video.duration;
    // Some videos (e.g. recorded in a browser) can't seek; then the first frame is used.
    await withTimeout(
      new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(1, (Number.isFinite(duration) ? duration : 0) / 2);
      }),
      3000,
    ).catch(() => undefined);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, 1));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    return {
      width: positive(video.videoWidth),
      height: positive(video.videoHeight),
      durationSeconds: positive(duration),
      poster,
    };
  } catch {
    // The browser can't decode it (e.g. an unusual codec). Upload it anyway, without a poster.
    return { width: null, height: null, durationSeconds: null, poster: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function uploadLocally(
  siteId: string,
  file: File,
  details: Details,
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.set("siteId", siteId);
    form.set("file", file);
    if (details.width) form.set("width", String(details.width));
    if (details.height) form.set("height", String(details.height));
    if (details.durationSeconds) form.set("duration", String(details.durationSeconds));
    if (details.poster) form.set("poster", details.poster, "poster.jpg");

    const request = new XMLHttpRequest();
    request.open("POST", "/api/media/local");
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      const body = request.response as (MediaItem & { error?: string }) | null;
      if (request.status >= 200 && request.status < 300 && body?.id) resolve(body);
      else reject(new Error(body?.error ?? "We couldn't upload that file. Please try again."));
    };
    request.onerror = () =>
      reject(new Error("The upload was interrupted. Check your connection and try again."));
    request.send(form);
  });
}

async function uploadToBlob(
  siteId: string,
  file: File,
  details: Details,
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  if (!isMediaType(file.type)) throw new Error(uploadProblem(file, "any") ?? "Unsupported file.");
  let blob;
  let posterUrl: string | null = null;
  try {
    blob = await upload(uploadPathname(siteId, file.name, file.type), file, {
      access: "public",
      handleUploadUrl: "/api/media/upload",
      contentType: file.type,
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    });
    if (details.poster) {
      const poster = await upload(
        uploadPathname(siteId, `${file.name}-poster.jpg`, "image/jpeg"),
        details.poster,
        { access: "public", handleUploadUrl: "/api/media/upload", contentType: "image/jpeg" },
      );
      posterUrl = poster.url;
    }
  } catch {
    throw new Error("The upload didn't go through. Check your connection and try again.");
  }
  const result = await recordBlobUpload({
    siteId,
    url: blob.url,
    fileName: file.name,
    width: details.width,
    height: details.height,
    posterUrl,
    durationSeconds: details.durationSeconds,
  });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/**
 * Uploads files one after another with progress (requirements MED-1, SB-40). Files are checked
 * in the browser first so people get a clear message right away; the server checks again.
 */
export function useUploads({
  siteId,
  mode,
  onUploaded,
  accept = "image",
}: {
  siteId: string;
  mode: UploadMode;
  onUploaded: (item: MediaItem, batchSize: number) => void;
  accept?: Accept;
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
          const problem = uploadProblem(file, accept);
          return {
            id,
            name: file.name,
            progress: 0,
            status: problem ? ("error" as const) : ("uploading" as const),
            error: problem ?? undefined,
          };
        }),
      ]);

      const valid = queued.filter(({ file }) => !uploadProblem(file, accept));
      for (const { file, id } of valid) {
        try {
          const details = isVideoType(file.type)
            ? await videoDetails(file)
            : await imageDetails(file);
          const onProgress = (progress: number) => update(id, { progress });
          const item =
            mode === "blob"
              ? await uploadToBlob(siteId, file, details, onProgress)
              : await uploadLocally(siteId, file, details, onProgress);
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
    [accept, mode, onUploaded, siteId],
  );

  const dismiss = (id: string) => setUploads((current) => current.filter((item) => item.id !== id));

  return { uploads, uploadFiles, dismiss };
}
