import { z } from "zod";

import { safeHref } from "./rich-text";

export const SOCIAL_NETWORKS = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { id: "x", label: "X (Twitter)", placeholder: "https://x.com/yourname" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
] as const;

export type SocialId = (typeof SOCIAL_NETWORKS)[number]["id"];

const httpsUrl = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]);

export const MAX_EXTRA_LINKS = 6;

export const navigationSchema = z.object({
  /** Extra menu items after the pages (e.g. a booking site or an online shop). */
  links: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().trim().max(40),
        href: z.string().trim().max(2000),
      }),
    )
    .max(MAX_EXTRA_LINKS)
    .catch([])
    .default([]),
  social: z
    .object(
      Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, httpsUrl.optional().catch(undefined)])),
    )
    .partial()
    .catch({})
    .default({}),
});

export type SiteNavigation = {
  links: { id: string; label: string; href: string }[];
  social: Partial<Record<SocialId, string>>;
};

export function normalizeNavigation(value: unknown): SiteNavigation {
  return navigationSchema.parse(value ?? {}) as SiteNavigation;
}

/** Social profiles as labelled links, in a fixed order, skipping empty ones. */
export function socialLinks(social: SiteNavigation["social"]): { label: string; href: string }[] {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const href = social[network.id];
    return href ? [{ label: network.label, href }] : [];
  });
}

/** Extra menu links that have a label and a safe destination. */
export function extraNavLinks(links: SiteNavigation["links"]): { label: string; href: string }[] {
  return links.flatMap((link) => {
    const href = safeHref(link.href);
    return link.label.trim() && href ? [{ label: link.label.trim(), href }] : [];
  });
}
