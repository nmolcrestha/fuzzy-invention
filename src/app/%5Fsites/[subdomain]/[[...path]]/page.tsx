import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { LivePage } from "@/components/live/live-site";
import { normalizeLivePath } from "@/lib/hosts";
import { siteUrl } from "@/lib/site-url";
import { autoDescription, seoTitle } from "@/sections/seo";
import type { PageSnapshot } from "@/sections/snapshot";
import { getLivePage, getLiveRedirect, getLiveSite, type LiveSite } from "@/server/live/queries";

type Props = PageProps<"/_sites/[subdomain]/[[...path]]">;

function toPath(segments: string[] | undefined): string {
  return normalizeLivePath((segments ?? []).join("/"));
}

async function resolve(
  props: Props,
): Promise<{ site: LiveSite; page: PageSnapshot } | { site: LiveSite | null; page: null }> {
  const { subdomain, path } = await props.params;
  const site = await getLiveSite(subdomain.toLowerCase());
  if (!site) return { site: null, page: null };
  return { site, page: await getLivePage(site.id, toPath(path)) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { site, page } = await resolve(props);
  if (!site) return { title: "Website not available", robots: { index: false } };
  const name = site.snapshot.name;
  if (!page) return { title: { absolute: `Page not found · ${name}` }, robots: { index: false } };

  const title = seoTitle(page, name);
  const description = page.seo.description?.trim() || autoDescription(page.sections);
  const url = siteUrl(site.subdomain, page.path);
  const image = page.seo.image || site.snapshot.branding.socialImage;
  const favicon = site.snapshot.branding.favicon;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: name,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
    robots: page.seo.noindex ? { index: false, follow: true } : undefined,
    ...(favicon && { icons: { icon: favicon } }),
  };
}

async function Content(props: Props) {
  const { site, page } = await resolve(props);
  if (site && !page) {
    // An old address of a page that moved: forward visitors to where it lives now.
    const target = await getLiveRedirect(site.id, toPath((await props.params).path));
    if (target) permanentRedirect(target);
  }
  if (!site || !page) notFound();
  return <LivePage site={site} page={page} />;
}

// Missing pages render the site's 404 page. Because the response is streamed, the HTTP status is
// 200 with a noindex tag (Next.js streaming behavior), which keeps them out of search results.
export default function PublishedPage(props: Props) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}
