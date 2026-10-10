// What gets frozen when publishing. Read back through the same normalizers so old snapshots keep
// rendering after section or theme schemas evolve.
import type { PageSeo } from "@/db/schema";

import type { ImageValue } from "./fields";

import { normalizeNavigation, type SiteNavigation } from "./navigation";
import { chromeBlock, normalizeBlock, type SectionBlock } from "./registry";
import { normalizeTheme, type SiteTheme } from "./theme";

export type SiteSnapshot = {
  name: string;
  theme: SiteTheme;
  header: SectionBlock;
  footer: SectionBlock;
  /** Menu: page ids in order (only pages that are live are shown), plus extra links. */
  navigation: SiteNavigation & { pageIds: string[] };
  contact: { email?: string; phone?: string; address?: string };
  branding: { logo?: ImageValue; favicon?: string; socialImage?: string };
};

export type PageSnapshot = {
  title: string;
  path: string;
  isHome: boolean;
  seo: PageSeo;
  /** Visible sections only. */
  sections: SectionBlock[];
};

export function parseSiteSnapshot(raw: Record<string, unknown>): SiteSnapshot {
  const navigation = (raw.navigation ?? {}) as Record<string, unknown>;
  const contact = (raw.contact ?? {}) as SiteSnapshot["contact"];
  const branding = (raw.branding ?? {}) as Record<string, unknown>;
  const logo = branding.logo as Partial<ImageValue> | undefined;
  const url = (value: unknown) =>
    typeof value === "string" && /^https?:\/\//.test(value) ? value : undefined;
  return {
    name: String(raw.name ?? ""),
    theme: normalizeTheme(raw.theme),
    header: chromeBlock("header", raw.header),
    footer: chromeBlock("footer", raw.footer),
    navigation: {
      ...normalizeNavigation(navigation),
      pageIds: Array.isArray(navigation.pageIds)
        ? navigation.pageIds.filter((id) => typeof id === "string")
        : [],
    },
    contact: {
      email: typeof contact.email === "string" ? contact.email : undefined,
      phone: typeof contact.phone === "string" ? contact.phone : undefined,
      address: typeof contact.address === "string" ? contact.address : undefined,
    },
    branding: {
      logo: url(logo?.src) ? { src: logo!.src!, alt: String(logo?.alt ?? "") } : undefined,
      favicon: url(branding.favicon),
      socialImage: url(branding.socialImage),
    },
  };
}

export function parsePageSnapshot(raw: Record<string, unknown>): PageSnapshot {
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  return {
    title: String(raw.title ?? ""),
    path: String(raw.path ?? "/"),
    isHome: Boolean(raw.isHome),
    seo: (raw.seo ?? {}) as PageSeo,
    sections: sections.flatMap((block) => {
      const normalized = normalizeBlock(block as Parameters<typeof normalizeBlock>[0]);
      return normalized && !normalized.isHidden ? [normalized] : [];
    }),
  };
}
