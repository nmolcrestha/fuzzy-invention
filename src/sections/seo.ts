// How a page appears in search results and when shared (requirement PAGE-8). Shared by the SEO
// panel (preview), the publish checks and the live site's metadata.
import { z } from "zod";

import type { PageSeo } from "@/db/schema";

import type { SectionBlock } from "./registry";
import { plainText, type RichTextDoc } from "./rich-text";

/** Roughly what Google shows before cutting text off. */
export const SEO_TITLE_LIMIT = 60;
export const SEO_DESCRIPTION_LIMIT = 160;

export const pageSeoSchema = z.object({
  title: z.string().trim().max(70, "Keep the title under 70 characters.").optional().default(""),
  description: z
    .string()
    .trim()
    .max(300, "Keep the description under 300 characters.")
    .optional()
    .default(""),
  image: z
    .union([z.literal(""), z.url({ protocol: /^https?$/, message: "Choose an image." })])
    .optional()
    .default(""),
  noindex: z.boolean().optional().default(false),
});

/** Stores only what's set, so "empty" always means "use the automatic value". */
export function cleanSeo(input: z.output<typeof pageSeoSchema>): PageSeo {
  return {
    ...(input.title && { title: input.title }),
    ...(input.description && { description: input.description }),
    ...(input.image && { image: input.image }),
    ...(input.noindex && { noindex: true }),
  };
}

export function sameSeo(a: PageSeo, b: PageSeo): boolean {
  return (
    (a.title ?? "") === (b.title ?? "") &&
    (a.description ?? "") === (b.description ?? "") &&
    (a.image ?? "") === (b.image ?? "") &&
    Boolean(a.noindex) === Boolean(b.noindex)
  );
}

/** The browser-tab / search-result title. */
export function seoTitle(
  page: { title: string; isHome: boolean; seo: PageSeo },
  siteName: string,
): string {
  return page.seo.title?.trim() || (page.isHome ? siteName : `${page.title} · ${siteName}`);
}

/** A short description from the page's first longer text, used when none is set. */
export function autoDescription(sections: SectionBlock[]): string | undefined {
  for (const block of sections) {
    if (block.isHidden) continue;
    for (const value of Object.values(block.data)) {
      const text =
        typeof value === "string"
          ? value
          : value && typeof value === "object" && (value as { type?: string }).type === "doc"
            ? plainText(value as RichTextDoc)
            : "";
      if (text.trim().length > 40) return text.trim().slice(0, SEO_DESCRIPTION_LIMIT);
    }
  }
  return undefined;
}

/** Non-blocking advice for the publish dialog. */
export function seoProblems(seo: PageSeo): string[] {
  const problems: string[] = [];
  if ((seo.title?.length ?? 0) > SEO_TITLE_LIMIT) {
    problems.push(
      `The search title is long, so Google may cut it off after ${SEO_TITLE_LIMIT} characters.`,
    );
  }
  if ((seo.description?.length ?? 0) > SEO_DESCRIPTION_LIMIT) {
    problems.push(
      `The search description is long, so Google may cut it off after ${SEO_DESCRIPTION_LIMIT} characters.`,
    );
  }
  if (seo.noindex) problems.push("This page is hidden from search engines.");
  return problems;
}
