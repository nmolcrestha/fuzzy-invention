/** Turns any text into a URL-safe slug: "Bella Cucina & Bar!" → "bella-cucina-bar". */
export function slugify(input: string, maxLength = 60): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

// ---------- Subdomains (site web address) ----------

export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 40;

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "mail",
  "email",
  "smtp",
  "ftp",
  "blog",
  "help",
  "support",
  "docs",
  "status",
  "static",
  "assets",
  "cdn",
  "preview",
  "auth",
  "login",
  "signup",
  "account",
  "billing",
]);

/** Returns a plain-language problem with the subdomain, or null when it's valid. */
export function subdomainProblem(subdomain: string): string | null {
  if (subdomain.length < SUBDOMAIN_MIN) return `Use at least ${SUBDOMAIN_MIN} characters.`;
  if (subdomain.length > SUBDOMAIN_MAX) return `Use at most ${SUBDOMAIN_MAX} characters.`;
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return "Use only lowercase letters, numbers and dashes.";
  }
  if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
    return "The address can't start or end with a dash.";
  }
  if (subdomain.includes("--")) return "Don't use two dashes in a row.";
  if (RESERVED_SUBDOMAINS.has(subdomain)) return "That address is reserved. Try another one.";
  return null;
}

/** Suggests a subdomain from a site name, padded if it would be too short. */
export function suggestSubdomain(name: string): string {
  const slug = slugify(name, SUBDOMAIN_MAX).replace(/-{2,}/g, "-");
  if (slug.length >= SUBDOMAIN_MIN) return slug;
  return slug ? `${slug}-site` : "my-site";
}

// ---------- Page paths ----------

const RESERVED_PATH_SEGMENTS = new Set([
  "api",
  "_next",
  "_sites",
  "preview",
  "sitemap.xml",
  "robots.txt",
]);

/** Builds a page path from a title: "About us" → "/about-us". */
export function pathFromTitle(title: string): string {
  const slug = slugify(title);
  return slug ? `/${slug}` : "/page";
}

/** Normalizes user input into a path: "About Us/" → "/about-us". Keeps nested segments. */
export function normalizePath(input: string): string {
  const segments = input
    .split("/")
    .map((segment) => slugify(segment))
    .filter(Boolean);
  return `/${segments.join("/")}`;
}

/** Returns a plain-language problem with a (normalized) page path, or null when it's valid. */
export function pathProblem(path: string): string | null {
  if (!path.startsWith("/")) return "The address must start with /.";
  if (path === "/") return null;
  if (path.length > 100) return "That address is too long.";
  if (!/^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/.test(path)) {
    return "Use only lowercase letters, numbers and dashes.";
  }
  const first = path.split("/")[1]!;
  if (RESERVED_PATH_SEGMENTS.has(first)) return "That address is reserved. Try another one.";
  return null;
}

/** Appends -2, -3… until `isTaken` returns false. */
export function uniqueVariant(base: string, isTaken: (candidate: string) => boolean): string {
  if (!isTaken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!isTaken(candidate)) return candidate;
  }
}
