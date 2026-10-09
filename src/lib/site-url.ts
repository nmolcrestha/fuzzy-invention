const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

/** Host shown to users, e.g. "bella.builder.app". */
export function siteHost(subdomain: string): string {
  return `${subdomain}.${ROOT_DOMAIN}`;
}

/** Full URL of a site (or one of its pages). */
export function siteUrl(subdomain: string, path = "/"): string {
  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${siteHost(subdomain)}${path === "/" ? "" : path}`;
}

export const rootDomain = ROOT_DOMAIN;
