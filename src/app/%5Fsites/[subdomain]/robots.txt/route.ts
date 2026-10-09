import { siteUrl } from "@/lib/site-url";
import { getLiveSite } from "@/server/live/queries";

export async function GET(_request: Request, ctx: RouteContext<"/_sites/[subdomain]/robots.txt">) {
  const { subdomain } = await ctx.params;
  const site = await getLiveSite(subdomain);
  const body = site
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl(site.subdomain, "/sitemap.xml")}\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
