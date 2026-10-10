import "server-only";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { pages, pageVersions, redirects, sites, siteVersions } from "@/db/schema";
import type { SiteContext } from "@/sections/components";
import { extraNavLinks, socialLinks } from "@/sections/navigation";
import {
  type PageSnapshot,
  parsePageSnapshot,
  parseSiteSnapshot,
  type SiteSnapshot,
} from "@/sections/snapshot";
import { liveTags } from "@/server/live-cache";

export type LiveSite = {
  id: string;
  subdomain: string;
  snapshot: SiteSnapshot;
  /** Every page visitors can reach. */
  pages: {
    id: string;
    path: string;
    title: string;
    isHome: boolean;
    noindex: boolean;
    publishedAt: string;
  }[];
};

/**
 * The published site behind a subdomain, or null when there's nothing to show (unknown, deleted,
 * offline, or never published). Cached until something is published or changed.
 */
export async function getLiveSite(subdomain: string): Promise<LiveSite | null> {
  "use cache";
  cacheTag(liveTags.host(subdomain));
  cacheLife("max");

  const [site] = await db
    .select({ id: sites.id, status: sites.status, versionId: sites.publishedVersionId })
    .from(sites)
    .where(and(eq(sites.subdomain, subdomain), isNull(sites.deletedAt)))
    .limit(1);
  if (!site || !site.versionId || site.status === "offline") return null;
  cacheTag(liveTags.site(site.id));

  const [[version], livePages] = await Promise.all([
    db
      .select({ snapshot: siteVersions.snapshot })
      .from(siteVersions)
      .where(eq(siteVersions.id, site.versionId))
      .limit(1),
    db
      .select({
        id: pages.id,
        path: pages.publishedPath,
        title: sql<string>`${pageVersions.snapshot}->>'title'`,
        isHome: sql<boolean>`coalesce((${pageVersions.snapshot}->>'isHome')::boolean, false)`,
        noindex: sql<boolean>`coalesce((${pageVersions.snapshot}->'seo'->>'noindex')::boolean, false)`,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .innerJoin(pageVersions, eq(pages.publishedVersionId, pageVersions.id))
      .where(
        and(eq(pages.siteId, site.id), isNull(pages.deletedAt), isNotNull(pages.publishedPath)),
      ),
  ]);
  if (!version) return null;

  return {
    id: site.id,
    subdomain,
    snapshot: parseSiteSnapshot(version.snapshot),
    pages: livePages.map((page) => ({
      id: page.id,
      path: page.path!,
      title: page.title,
      isHome: page.isHome,
      noindex: page.noindex,
      publishedAt: (page.publishedAt ?? new Date()).toISOString(),
    })),
  };
}

/** The published version of the page at `path`, or null. */
export async function getLivePage(siteId: string, path: string): Promise<PageSnapshot | null> {
  "use cache";
  cacheTag(liveTags.site(siteId));
  cacheLife("max");

  const [row] = await db
    .select({ snapshot: pageVersions.snapshot })
    .from(pages)
    .innerJoin(pageVersions, eq(pages.publishedVersionId, pageVersions.id))
    .where(and(eq(pages.siteId, siteId), eq(pages.publishedPath, path), isNull(pages.deletedAt)))
    .limit(1);
  return row ? parsePageSnapshot(row.snapshot) : null;
}

/** Where to send visitors of an old address (requirement PAGE-7), or null. */
export async function getLiveRedirect(siteId: string, path: string): Promise<string | null> {
  "use cache";
  cacheTag(liveTags.site(siteId));
  cacheLife("max");

  const [row] = await db
    .select({ toPath: redirects.toPath })
    .from(redirects)
    .where(and(eq(redirects.siteId, siteId), eq(redirects.fromPath, path)))
    .limit(1);
  return row?.toPath ?? null;
}

/**
 * The current year, for copyright lines. Cached because live pages are prerendered, where reading
 * the clock directly isn't allowed.
 */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("hours");
  return new Date().getFullYear();
}

/** Menu, contact and social links as visitors see them: only live pages appear in the menu. */
export function liveSiteContext(site: LiveSite, year: number): SiteContext {
  const byId = new Map(site.pages.map((page) => [page.id, page]));
  const { navigation, contact, name } = site.snapshot;
  return {
    siteName: name,
    nav: [
      ...navigation.pageIds.flatMap((id) => {
        const page = byId.get(id);
        return page ? [{ label: page.title, href: page.path }] : [];
      }),
      ...extraNavLinks(navigation.links),
    ],
    contact,
    social: socialLinks(navigation.social),
    year,
    logo: site.snapshot.branding.logo,
    live: true,
  };
}
