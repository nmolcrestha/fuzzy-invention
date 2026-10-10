import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { env } from "@/env";
import { auth } from "@/lib/auth";
import { ALLOWED_IMAGE_TYPES, keyBelongsToSite, MAX_UPLOAD_BYTES } from "@/lib/media-rules";
import { findOwnedSite } from "@/server/sites/access";

/**
 * Issues short-lived tokens for direct browser → Vercel Blob uploads (requirement MED-1).
 * The token only allows images up to 10 MB, under the site's own folder. The browser records the
 * finished upload with the `recordBlobUpload` server action.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Uploads to Blob storage aren't set up." }, { status: 404 });
  }
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) throw new Error("Not signed in");
        const siteId = pathname.split("/")[1] ?? "";
        const site = await findOwnedSite(session.user.id, siteId);
        if (!site || !keyBelongsToSite(pathname, site.id)) throw new Error("Not allowed");
        return {
          allowedContentTypes: ALLOWED_IMAGE_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "You can't upload images to this website. Try signing in again." },
      { status: 400 },
    );
  }
}
