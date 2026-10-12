import { z } from "zod";

import type { SectionStyle } from "@/db/schema";

import {
  ctaSection,
  faqSection,
  featuresSection,
  footerSection,
  headerSection,
  heroSection,
  textSection,
} from "./defs";
import {
  contactSection,
  gallerySection,
  hoursSection,
  logosSection,
  menuSection,
  pricingSection,
  statsSection,
  stepsSection,
  teamSection,
  testimonialsSection,
  textImageSection,
  videoSection,
} from "./defs-more";
import { backdropSchema } from "./backdrop";
import { customSection } from "./custom";
import { dataSchema, defaults } from "./fields";
import { formSection } from "./form";
import type { SectionDefinition } from "./types";

// Order here is the order in the section picker (within each category).
const ALL: SectionDefinition[] = [
  headerSection,
  footerSection,
  heroSection,
  featuresSection,
  textImageSection,
  stepsSection,
  textSection,
  statsSection,
  testimonialsSection,
  logosSection,
  teamSection,
  ctaSection,
  pricingSection,
  faqSection,
  gallerySection,
  videoSection,
  formSection,
  contactSection,
  hoursSection,
  menuSection,
  customSection,
];

export const SECTION_DEFS: Record<string, SectionDefinition> = Object.fromEntries(
  ALL.map((def) => [def.type, def]),
);

/** Section types users can add to pages, in picker order. */
export const PAGE_SECTION_TYPES = ALL.filter((def) => def.placement === "page" && !def.hidden);

export function getSectionDef(type: string): SectionDefinition | undefined {
  return SECTION_DEFS[type];
}

/** A section as the editor and renderer see it. */
export type SectionBlock = {
  id: string;
  type: string;
  variant: string;
  schemaVersion: number;
  data: Record<string, unknown>;
  style: SectionStyle;
  isHidden: boolean;
};

export type ChromeBlocks = { header: SectionBlock; footer: SectionBlock };

export const sectionStyleSchema = z.object({
  background: z.enum(["default", "muted", "primary", "dark"]).catch("default").optional(),
  backdrop: backdropSchema.optional().catch(undefined),
  spacing: z.enum(["compact", "normal", "spacious"]).catch("normal").optional(),
  anchorId: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]*$/)
    .catch("")
    .optional(),
});

export function newSectionBlock(
  type: string,
  id: string = globalThis.crypto.randomUUID(),
): SectionBlock {
  const def = SECTION_DEFS[type];
  if (!def) throw new Error(`Unknown section type: ${type}`);
  return {
    id,
    type,
    variant: def.variants[0]!.id,
    schemaVersion: def.schemaVersion,
    data: defaults(def.fields),
    style: {},
    isHidden: false,
  };
}

/**
 * Validates and normalizes a block (fills missing fields with defaults, drops unknown keys).
 * Returns null for unknown types or variants.
 */
export function normalizeBlock(block: {
  id: string;
  type: string;
  variant: string;
  data: unknown;
  style?: unknown;
  isHidden?: boolean;
}): SectionBlock | null {
  const def = SECTION_DEFS[block.type];
  if (!def || !def.variants.some((variant) => variant.id === block.variant)) return null;
  const data = dataSchema(def.fields).safeParse(block.data ?? {});
  const style = sectionStyleSchema.safeParse(block.style ?? {});
  if (!data.success) return null;
  return {
    id: block.id,
    type: block.type,
    variant: block.variant,
    schemaVersion: def.schemaVersion,
    data: data.data,
    style: style.success ? style.data : {},
    isHidden: Boolean(block.isHidden),
  };
}

/** The site's header/footer, falling back to defaults when none has been saved yet. */
export function chromeBlock(kind: "header" | "footer", stored: unknown): SectionBlock {
  const fallback = newSectionBlock(kind, kind);
  if (!stored || typeof stored !== "object") return fallback;
  const value = stored as Record<string, unknown>;
  return (
    normalizeBlock({
      id: kind,
      type: kind,
      variant: String(value.variant ?? ""),
      data: value.data,
      style: value.style,
    }) ?? fallback
  );
}
