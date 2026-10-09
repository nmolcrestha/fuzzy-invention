import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { SiteStatusBadge } from "@/components/sites/status-badge";
import { SiteTabs } from "@/components/sites/site-tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { siteHost } from "@/lib/site-url";
import { getMySiteOr404 } from "@/server/sites/queries";

export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/dashboard/sites/[siteId]">) {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Your sites
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
          <SiteStatusBadge status={site.status} />
        </div>
        <Tooltip>
          {/* Published sites are served from Phase 3 on; until then the address is reserved but empty. */}
          <TooltipTrigger
            render={<span tabIndex={0} />}
            className="inline-flex cursor-default items-center gap-1 text-sm text-muted-foreground"
          >
            <ExternalLinkIcon className="size-3.5" aria-hidden />
            {siteHost(site.subdomain)}
          </TooltipTrigger>
          <TooltipContent>Your website will appear here once you publish it.</TooltipContent>
        </Tooltip>
      </div>
      <SiteTabs siteId={site.id} />
      {children}
    </div>
  );
}
