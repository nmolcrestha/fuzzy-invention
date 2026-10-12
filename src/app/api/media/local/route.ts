import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  isVideoType,
  MAX_VIDEO_BYTES,
  mediaKind,
  sniffImageType,
  sniffMediaType,
  uploadPathname,
  uploadProblem,
} from "@/lib/media-rules";
import { recordAsset } from "@/server/media/queries";
import { saveLocalFile, uploadMode, withRandomSuffix } from "@/server/media/storage";
import { findOwnedSite } from "@/server/sites/access";

const positiveInt = (value: FormDataEntryValue | null | undefined, max: number) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 && number <= max ? number : null;
};

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Development uploads (no Vercel Blob token): the browser posts the file here and it's saved to
 * .data/uploads. Same checks as Blob uploads, plus the file's bytes must really be an image or
 * video. A video can come with a poster image (a still frame made in the browser).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (uploadMode !== "local") return fail("Not found", 404);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return fail("Your session has ended. Sign in again.", 401);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES + 12 * 1024 * 1024) {
    return fail("That file is too large. Videos can be up to 50 MB, images up to 10 MB.", 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const site = await findOwnedSite(session.user.id, String(form?.get("siteId") ?? ""));
  if (!site || !(file instanceof File)) return fail("We couldn't find that website.", 404);

  const problem = uploadProblem(file, "any");
  if (problem) return fail(problem, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffMediaType(bytes);
  if (!type || mediaKind(type) !== (isVideoType(file.type) ? "video" : "image")) {
    return fail(
      isVideoType(file.type)
        ? `“${file.name}” doesn't look like a video. Use MP4 or WebM.`
        : `“${file.name}” doesn't look like an image. Use JPG, PNG, WebP, GIF or SVG.`,
      400,
    );
  }

  try {
    const key = withRandomSuffix(uploadPathname(site.id, file.name, type));
    const url = await saveLocalFile(key, bytes);

    let posterUrl: string | null = null;
    const poster = form!.get("poster");
    if (mediaKind(type) === "video" && poster instanceof File && poster.size < 5 * 1024 * 1024) {
      const posterBytes = new Uint8Array(await poster.arrayBuffer());
      const posterType = sniffImageType(posterBytes);
      if (
        posterType === "image/jpeg" ||
        posterType === "image/png" ||
        posterType === "image/webp"
      ) {
        posterUrl = await saveLocalFile(key.replace(/\.[a-z0-9]+$/i, "-poster.jpg"), posterBytes);
      }
    }

    const item = await recordAsset({
      siteId: site.id,
      userId: session.user.id,
      storageKey: key,
      url,
      fileName: file.name,
      mimeType: type,
      sizeBytes: bytes.byteLength,
      width: positiveInt(form!.get("width"), 50_000),
      height: positiveInt(form!.get("height"), 50_000),
      posterUrl,
      durationSeconds: positiveInt(form!.get("duration"), 24 * 60 * 60),
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Local upload failed", error);
    return fail("We couldn't save that file. Please try again.", 500);
  }
}
