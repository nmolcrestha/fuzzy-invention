// Upload rules shared by the browser (early, friendly errors) and the server (the real check).
import { slugify } from "./slug";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;
export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_TYPES) as ImageType[];

export function isImageType(type: string): type is ImageType {
  return type in IMAGE_TYPES;
}

/** A plain-language reason the file can't be uploaded, or null when it's fine. */
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  if (!isImageType(file.type)) {
    return `“${file.name}” isn't a supported image. Use JPG, PNG, WebP, GIF or SVG.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Images can be up to ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  if (file.size === 0) return `“${file.name}” is empty.`;
  return null;
}

/** Where a site's upload is stored: "sites/<siteId>/<name>.<ext>" (storage adds a random suffix). */
export function uploadPathname(siteId: string, fileName: string, type: ImageType): string {
  const base = slugify(fileName.replace(/\.[^.]+$/, ""), 40) || "image";
  return `sites/${siteId}/${base}.${IMAGE_TYPES[type]}`;
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

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}
