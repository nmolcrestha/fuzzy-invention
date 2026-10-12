// Upload rules shared by the browser (early, friendly errors) and the server (the real check).
import { slugify } from "./slug";

export type MediaKind = "image" | "video";

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
} as const;

export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;
export type VideoType = keyof typeof VIDEO_TYPES;
export type MediaType = ImageType | VideoType;

export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_TYPES) as ImageType[];
export const ALLOWED_VIDEO_TYPES = Object.keys(VIDEO_TYPES) as VideoType[];
export const ALLOWED_MEDIA_TYPES: MediaType[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Kept for callers that only deal with images. */
export const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;

export const EXTENSIONS: Record<MediaType, string> = { ...IMAGE_TYPES, ...VIDEO_TYPES };

export function isImageType(type: string): type is ImageType {
  return type in IMAGE_TYPES;
}

export function isVideoType(type: string): type is VideoType {
  return type in VIDEO_TYPES;
}

export function isMediaType(type: string): type is MediaType {
  return isImageType(type) || isVideoType(type);
}

export function mediaKind(type: MediaType): MediaKind {
  return isVideoType(type) ? "video" : "image";
}

export function maxBytesFor(type: MediaType): number {
  return isVideoType(type) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/** Which kinds an upload control takes: images (the default), videos, or both. */
export type Accept = MediaKind | "any";

export function acceptedTypes(accept: Accept): MediaType[] {
  return accept === "image"
    ? ALLOWED_IMAGE_TYPES
    : accept === "video"
      ? ALLOWED_VIDEO_TYPES
      : ALLOWED_MEDIA_TYPES;
}

const ACCEPT_HELP: Record<Accept, string> = {
  image: "isn't a supported image. Use JPG, PNG, WebP, GIF or SVG.",
  video: "isn't a supported video. Use MP4 or WebM.",
  any: "isn't a supported image or video. Use JPG, PNG, WebP, GIF, SVG, MP4 or WebM.",
};

/** A plain-language reason the file can't be uploaded, or null when it's fine. */
export function uploadProblem(
  file: { name: string; type: string; size: number },
  accept: Accept = "image",
): string | null {
  if (!(acceptedTypes(accept) as string[]).includes(file.type)) {
    return `“${file.name}” ${ACCEPT_HELP[accept]}`;
  }
  const type = file.type as MediaType;
  const max = maxBytesFor(type);
  if (file.size > max) {
    const noun = mediaKind(type) === "video" ? "Videos" : "Images";
    return `“${file.name}” is ${formatBytes(file.size)}. ${noun} can be up to ${formatBytes(max)}.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

/** Where a site's upload is stored: "sites/<siteId>/<name>.<ext>" (storage adds a random suffix). */
export function uploadPathname(siteId: string, fileName: string, type: MediaType): string {
  const base = slugify(fileName.replace(/\.[^.]+$/, ""), 40) || mediaKind(type);
  return `sites/${siteId}/${base}.${EXTENSIONS[type]}`;
}

/** True when a storage key belongs to the given site. */
export function keyBelongsToSite(key: string, siteId: string): boolean {
  const prefix = `sites/${siteId}/`;
  return key.startsWith(prefix) && /^[a-z0-9._-]+$/i.test(key.slice(prefix.length));
}

/**
 * Detects the image type from the file's first bytes, so a renamed file can't pretend to be an
 * image. Returns null for anything that isn't one of the allowed types.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart().toLowerCase();
  if (
    (head.startsWith("<?xml") || head.startsWith("<svg") || head.startsWith("<!--")) &&
    head.includes("<svg")
  ) {
    return "image/svg+xml";
  }
  return null;
}

/** Like sniffImageType, for every allowed type (MP4: "ftyp" box; WebM: EBML header). */
export function sniffMediaType(bytes: Uint8Array): MediaType | null {
  const image = sniffImageType(bytes);
  if (image) return image;
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") return "video/mp4";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}
