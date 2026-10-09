import { headers } from "next/headers";
import { Suspense } from "react";

import { LiveNotFound, NoSite } from "@/components/live/live-site";
import { subdomainFromHost } from "@/lib/hosts";
import { getLiveSite } from "@/server/live/queries";

// not-found files don't receive params, so the site is found from the request's host.
async function SiteNotFound() {
  const subdomain = subdomainFromHost((await headers()).get("host"));
  const site = subdomain ? await getLiveSite(subdomain) : null;
  return site ? <LiveNotFound site={site} /> : <NoSite />;
}

export default function NotFound() {
  return (
    <Suspense>
      <SiteNotFound />
    </Suspense>
  );
}
