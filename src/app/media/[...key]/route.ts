import { EXTENSIONS, type MediaType } from "@/lib/media-rules";
import { readLocalFile } from "@/server/media/storage";

const TYPE_BY_EXTENSION = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, extension]) => [extension, type as MediaType]),
);

/**
 * Serves development uploads from .data/uploads (production uses Vercel Blob URLs). Supports
 * byte ranges, which browsers use to stream and seek videos.
 */
export async function GET(request: Request, { params }: RouteContext<"/media/[...key]">) {
  const { key } = await params;
  const name = key.join("/");
  const type = TYPE_BY_EXTENSION[name.split(".").pop()?.toLowerCase() ?? ""];
  const file = type ? await readLocalFile(name) : null;
  if (!file || !type) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": type,
    // File names are unique, so they never change.
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // SVGs opened directly can't run scripts on our origin.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = file.byteLength;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }
  return new Response(new Uint8Array(file), { headers });
}
