import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LivePage } from "@/components/live/live-site";
import { normalizeLivePath } from "@/lib/hosts";
import { siteUrl } from "@/lib/site-url";
import { plainText } from "@/sections/rich-text";
import type { PageSnapshot } from "@/sections/snapshot";
import { getLivePage, getLiveSite, type LiveSite } from "@/server/live/queries";

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

/** A short description from the page's first text, used when no SEO description is set. */
function autoDescription(page: PageSnapshot): string | undefined {
  for (const block of page.sections) {
    for (const value of Object.values(block.data)) {
      const text =
        typeof value === "string"
          ? value
          : value && typeof value === "object" && (value as { type?: string }).type === "doc"
            ? plainText(value as Parameters<typeof plainText>[0])
            : "";
      if (text.trim().length > 40) return text.trim().slice(0, 160);
    }
  }
  return undefined;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { site, page } = await resolve(props);
  if (!site) return { title: "Website not available", robots: { index: false } };
  const name = site.snapshot.name;
  if (!page) return { title: { absolute: `Page not found · ${name}` }, robots: { index: false } };

  const title = page.seo.title?.trim() || (page.isHome ? name : `${page.title} · ${name}`);
  const description = page.seo.description?.trim() || autoDescription(page);
  const url = siteUrl(site.subdomain, page.path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: name, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots: page.seo.noindex ? { index: false, follow: true } : undefined,
  };
}

async function Content(props: Props) {
  const { site, page } = await resolve(props);
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
