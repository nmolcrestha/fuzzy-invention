import { ExternalLinkIcon, FileTextIcon, GlobeIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { DeletedSites } from "@/components/sites/deleted-sites";
import { SiteStatusBadge } from "@/components/sites/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { siteHost } from "@/lib/site-url";
import { listMyDeletedSites, listMySites, SITE_RETENTION_DAYS } from "@/server/sites/queries";

export const metadata: Metadata = { title: "Your sites" };

export default async function DashboardPage() {
  const [user, sites, deletedSites] = await Promise.all([
    requireUser(),
    listMySites(),
    listMyDeletedSites(),
  ]);
  const firstName = user.name.split(" ")[0];

  const newSiteButton = (
    <ButtonLink href="/dashboard/new">
      <PlusIcon aria-hidden />
      {sites.length === 0 ? "Create your first website" : "New website"}
    </ButtonLink>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">
            {sites.length === 0
              ? "Let's get your first website online."
              : "Here are your websites."}
          </p>
        </div>
        {sites.length > 0 && newSiteButton}
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={GlobeIcon}
          title="You don't have a website yet"
          description="Tell us what you're building (a SaaS landing page, a company site or a restaurant) and we'll set it up for you."
          action={newSiteButton}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <li key={site.id}>
              <Card className="relative h-full transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
                <CardHeader>
                  <CardTitle className="truncate">
                    <Link
                      href={`/dashboard/sites/${site.id}`}
                      className="after:absolute after:inset-0"
                    >
                      {site.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 truncate">
                    <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                    {siteHost(site.subdomain)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 w-fit">
                  <SiteStatusBadge
                    status={site.status}
                    changeCount={site.changedPageCount + (site.designChanged ? 1 : 0)}
                  />
                </CardContent>
                <CardFooter className="justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileTextIcon className="size-4" aria-hidden />
                    {site.pageCount} {site.pageCount === 1 ? "page" : "pages"}
                  </span>
                  <span>Edited {timeAgo(site.updatedAt)}</span>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {deletedSites.length > 0 && (
        <DeletedSites sites={deletedSites} retentionDays={SITE_RETENTION_DAYS} />
      )}
    </div>
  );
}
