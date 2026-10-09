import type { Fields } from "./fields";

export type SectionCategory = "intro" | "content" | "social-proof" | "conversion" | "site";

/** Where a section type can be used: on pages, or as the site's header / footer. */
export type SectionPlacement = "page" | "header" | "footer";

export type SectionVariant = { id: string; label: string };

export type SectionDefinition = {
  type: string;
  name: string;
  /** One sentence for the section picker. */
  description: string;
  category: SectionCategory;
  placement: SectionPlacement;
  variants: readonly SectionVariant[];
  fields: Fields;
  /** Bump when stored data must be migrated. */
  schemaVersion: number;
  /** Fields that only make sense for some variants. */
  fieldsForVariant?: (variant: string) => string[] | null;
};

export function defineSection<const T extends SectionDefinition>(definition: T): T {
  return definition;
}

export const CATEGORY_LABELS: Record<SectionCategory, string> = {
  intro: "Intro",
  content: "Content",
  "social-proof": "Social proof",
  conversion: "Get people to act",
  site: "Site",
};
