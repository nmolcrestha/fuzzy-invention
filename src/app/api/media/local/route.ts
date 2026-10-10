import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, sniffImageType, uploadPathname, uploadProblem } from "@/lib/media-rules";
import { recordAsset } from "@/server/media/queries";
import { saveLocalFile, uploadMode, withRandomSuffix } from "@/server/media/storage";
import { findOwnedSite } from "@/server/sites/access";

const dimension = (value: FormDataEntryValue | null) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 50_000 ? number : null;
};

/**
 * Development uploads (no Vercel Blob token): the browser posts the file here and it's saved to
 * .data/uploads. Same checks as Blob uploads, plus the file's bytes must really be an image.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (uploadMode !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Your session has ended. Sign in again." }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json(
      { error: "That image is too large. The limit is 10 MB." },
      { status: 413 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const site = await findOwnedSite(session.user.id, String(form?.get("siteId") ?? ""));
  if (!site || !(file instanceof File)) {
    return NextResponse.json({ error: "We couldn't find that website." }, { status: 404 });
  }

  const problem = uploadProblem(file);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    return NextResponse.json(
      { error: `“${file.name}” doesn't look like an image. Use JPG, PNG, WebP, GIF or SVG.` },
      { status: 400 },
    );
  }

  try {
    const key = withRandomSuffix(uploadPathname(site.id, file.name, type));
    const url = await saveLocalFile(key, bytes);
    const item = await recordAsset({
      siteId: site.id,
      userId: session.user.id,
      storageKey: key,
      url,
      fileName: file.name,
      mimeType: type,
      sizeBytes: bytes.byteLength,
      width: dimension(form!.get("width")),
      height: dimension(form!.get("height")),
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Local upload failed", error);
    return NextResponse.json(
      { error: "We couldn't save that image. Please try again." },
      { status: 500 },
    );
  }
}
