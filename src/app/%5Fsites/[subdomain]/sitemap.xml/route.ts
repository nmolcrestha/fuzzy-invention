import { siteUrl } from "@/lib/site-url";
import { getLiveSite } from "@/server/live/queries";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

export async function GET(_request: Request, ctx: RouteContext<"/_sites/[subdomain]/sitemap.xml">) {
  const { subdomain } = await ctx.params;
  const site = await getLiveSite(subdomain);
  if (!site) return new Response("Not found", { status: 404 });

  const urls = site.pages
    .filter((page) => !page.noindex)
    .sort((a, b) => (a.isHome ? -1 : b.isHome ? 1 : a.path.localeCompare(b.path)))
    .map(
      (page) =>
        `  <url><loc>${escapeXml(siteUrl(site.subdomain, page.path))}</loc><lastmod>${page.publishedAt}</lastmod></url>`,
    );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
