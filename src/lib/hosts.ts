const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();

/** "bella.builder.app" → "bella"; null for the app itself or anything else. */
export function subdomainFromHost(host: string | null, root = ROOT_DOMAIN): string | null {
  if (!host) return null;
  const value = host.toLowerCase();
  if (value === root || !value.endsWith(`.${root}`)) return null;
  const subdomain = value.slice(0, -(root.length + 1));
  if (!subdomain || subdomain.includes(".") || subdomain === "www") return null;
  return subdomain;
}

/** "/Menu/" → "/menu". Same normalization the page lookup uses. */
export function normalizeLivePath(pathname: string): string {
  const parts = pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).toLowerCase();
      } catch {
        return segment.toLowerCase();
      }
    })
    .filter(Boolean);
  return `/${parts.join("/")}`;
}
