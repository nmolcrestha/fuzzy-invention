import "server-only";

import { updateTag } from "next/cache";

/** Cache tags for the public (published) site. */
export const liveTags = {
  site: (siteId: string) => `site:${siteId}`,
  host: (subdomain: string) => `site-host:${subdomain}`,
};

/**
 * Makes the next visit to the live site read fresh data. Call from server actions after anything
 * that changes what visitors see: publishing, deleting/restoring a page or site, changing the
 * web address.
 */
export function invalidateLiveSite(siteId: string, subdomains: string[] = []) {
  updateTag(liveTags.site(siteId));
  for (const subdomain of subdomains) updateTag(liveTags.host(subdomain));
}
