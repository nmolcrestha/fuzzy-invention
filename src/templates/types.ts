import type { SectionStyle, SiteKind } from "@/db/schema";

export type TemplateContext = { name: string; tagline: string };

export type TemplateSection = {
  type: string;
  variant?: string;
  /** Only the fields that differ from the section's defaults. List items don't need ids. */
  data?: Record<string, unknown>;
  style?: SectionStyle;
};

export type TemplatePage = {
  title: string;
  path: string;
  isHome?: boolean;
  showInNav?: boolean;
  sections: TemplateSection[];
};

export type TemplateSiteContent = {
  header: Omit<TemplateSection, "type">;
  footer: Omit<TemplateSection, "type">;
  pages: TemplatePage[];
};

export type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  /** Which "What are you building?" answer it's recommended for. */
  kind: Exclude<SiteKind, "other">;
  /** Theme preset id from sections/theme.ts. */
  preset: string;
  build: (ctx: TemplateContext) => TemplateSiteContent;
};
