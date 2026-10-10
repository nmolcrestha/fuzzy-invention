import { HomeIcon, PaletteIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VersionList } from "@/components/versions/version-list";
import { cn } from "@/lib/utils";
import { getMySiteOr404, listPages } from "@/server/sites/queries";
import { listPageVersions, listSiteVersions } from "@/server/versions/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/history">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · History` };
}

export default async function SiteHistoryPage({
  params,
  searchParams,
}: PageProps<"/dashboard/sites/[siteId]/history">) {
  const [{ siteId }, query] = await Promise.all([params, searchParams]);
  const [site, sitePages] = await Promise.all([getMySiteOr404(siteId), listPages(siteId)]);
  const requested = typeof query.item === "string" ? query.item : null;
  const page =
    requested === "design"
      ? null
      : (sitePages.find((candidate) => candidate.id === requested) ??
        sitePages.find((candidate) => candidate.isHome) ??
        sitePages[0] ??
        null);
  const base = `/dashboard/sites/${site.id}/history`;

  const versions = page
    ? await listPageVersions(page.id, page.publishedVersionId)
    : await listSiteVersions(site.id, site.publishedVersionId);

  const entries = [
    ...sitePages.map((candidate) => ({
      key: candidate.id,
      href: `${base}?item=${candidate.id}`,
      label: candidate.title,
      icon: candidate.isHome ? HomeIcon : null,
      active: page?.id === candidate.id,
      changed: Boolean(candidate.publishedVersionId && candidate.hasUnpublishedChanges),
    })),
    {
      key: "design",
      href: `${base}?item=design`,
      label: "Site design & menu",
      icon: PaletteIcon,
      active: page === null,
      changed: Boolean(site.publishedVersionId && site.designHasUnpublishedChanges),
    },
  ];

  return (
    <section className="space-y-4 pt-2">
      <div>
        <h2 className="sr-only">Version history</h2>
        <p className="text-sm text-muted-foreground">
          Every publish saves a version. Restore one to bring it back into your draft, then publish
          it again.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Pages and site design">
          <ul className="grid gap-1">
            {entries.map((entry) => (
              <li key={entry.key}>
                <Link
                  href={entry.href}
                  aria-current={entry.active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted",
                    entry.active && "bg-muted font-medium",
                  )}
                >
                  {entry.icon ? (
                    <entry.icon className="size-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <span className="size-4" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                  {entry.changed && (
                    <span
                      className="size-2 rounded-full bg-amber-500"
                      aria-label="Has unpublished changes"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <VersionList
          key={page?.id ?? "design"}
          versions={versions}
          item={
            page
              ? {
                  kind: "page",
                  id: page.id,
                  title: page.title,
                  changed: page.hasUnpublishedChanges,
                  published: Boolean(page.publishedVersionId),
                  editorHref: `/editor/${site.id}/${page.id}`,
                }
              : {
                  kind: "design",
                  siteId: site.id,
                  changed: site.designHasUnpublishedChanges,
                  published: Boolean(site.publishedVersionId),
                }
          }
        />
      </div>
    </section>
  );
}
