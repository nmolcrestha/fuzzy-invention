import type { Metadata } from "next";

import { SiteSettingsForm } from "@/components/sites/site-settings-form";
import { getMySiteOr404, SITE_RETENTION_DAYS } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/settings">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Settings` };
}

export default async function SiteSettingsPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/settings">) {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);

  return (
    <SiteSettingsForm
      // Remount with fresh values when the site changes on the server.
      key={site.updatedAt.toISOString()}
      siteId={site.id}
      isPublished={site.status === "live"}
      retentionDays={SITE_RETENTION_DAYS}
      initial={{
        name: site.name,
        subdomain: site.subdomain,
        contactEmail: site.settings.contactEmail ?? "",
        phone: site.settings.phone ?? "",
        address: site.settings.address ?? "",
      }}
    />
  );
}
