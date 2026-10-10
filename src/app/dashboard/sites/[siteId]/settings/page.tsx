import type { Metadata } from "next";

import { BrandingForm } from "@/components/sites/branding-form";
import { RedirectsCard } from "@/components/sites/redirects-card";
import { SiteSettingsForm } from "@/components/sites/site-settings-form";
import { listRedirects } from "@/server/redirects/queries";
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
  const redirects = await listRedirects(site.id);

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
    >
      <BrandingForm
        siteId={site.id}
        initial={{
          logo: site.settings.logo ?? { src: "", alt: "" },
          favicon: site.settings.favicon ?? "",
          socialImage: site.settings.socialImage ?? "",
        }}
      />
      <RedirectsCard siteId={site.id} redirects={redirects} />
    </SiteSettingsForm>
  );
}
