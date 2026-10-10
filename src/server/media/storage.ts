import "server-only";

import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del } from "@vercel/blob";

import { env } from "@/env";

/**
 * Where uploads go. With a Vercel Blob token, browsers upload straight to Blob storage.
 * Without one (local development), files are posted to our server and kept in .data/uploads.
 */
export const uploadMode: "blob" | "local" = env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";

// Development storage only; turbopackIgnore keeps the build from tracing the whole project.
const LOCAL_ROOT = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "uploads");
const LOCAL_PREFIX = `${env.NEXT_PUBLIC_APP_URL}/media/`;
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;

function localFile(key: string): string | null {
  const segments = key.split("/");
  if (segments.length < 2 || !segments.every((segment) => SAFE_SEGMENT.test(segment))) return null;
  return path.join(LOCAL_ROOT, ...segments);
}

/** Adds a random suffix so two uploads with the same name never overwrite each other. */
export function withRandomSuffix(pathname: string): string {
  const suffix = globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  return pathname.replace(/(\.[a-z0-9]+)$/i, `-${suffix}$1`);
}

export async function saveLocalFile(key: string, bytes: Uint8Array): Promise<string> {
  const file = localFile(key);
  if (!file) throw new Error(`Unsafe storage key: ${key}`);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ file, bytes);
  return LOCAL_PREFIX + key;
}

export async function readLocalFile(key: string): Promise<Buffer | null> {
  const file = localFile(key);
  if (!file) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ file);
  } catch {
    return null;
  }
}

/** Removes the stored file. Missing files are ignored. */
export async function deleteStoredFile(asset: { storageKey: string; url: string }) {
  if (asset.url.startsWith(LOCAL_PREFIX)) {
    const file = localFile(asset.storageKey);
    if (file) await unlink(/*turbopackIgnore: true*/ file).catch(() => undefined);
    return;
  }
  await del(asset.url, { token: env.BLOB_READ_WRITE_TOKEN });
}
