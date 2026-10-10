import { IMAGE_TYPES, type ImageType } from "@/lib/media-rules";
import { readLocalFile } from "@/server/media/storage";

const TYPE_BY_EXTENSION = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([type, extension]) => [extension, type as ImageType]),
);

/** Serves development uploads from .data/uploads (production uses Vercel Blob URLs). */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...key]">) {
  const { key } = await params;
  const name = key.join("/");
  const type = TYPE_BY_EXTENSION[name.split(".").pop()?.toLowerCase() ?? ""];
  const file = type ? await readLocalFile(name) : null;
  if (!file || !type) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": type,
      // File names are unique, so they never change.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // SVGs opened directly can't run scripts on our origin.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
