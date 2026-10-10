import type { Field, Fields } from "@/sections/fields";
import {
  getSectionDef,
  newSectionBlock,
  normalizeBlock,
  type SectionBlock,
} from "@/sections/registry";
import { normalizeTheme, type SiteTheme, THEME_PRESETS } from "@/sections/theme";

import type { TemplateContext, TemplateDefinition, TemplateSection } from "./types";

export type MaterializedPage = {
  title: string;
  path: string;
  isHome: boolean;
  showInNav: boolean;
  blocks: SectionBlock[];
};

export type MaterializedSite = {
  theme: SiteTheme;
  header: SectionBlock;
  footer: SectionBlock;
  pages: MaterializedPage[];
};

const newId = () => globalThis.crypto.randomUUID();

/** Merges template overrides into default data, giving list items ids at every depth. */
function mergeData(
  fields: Fields,
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>,
) {
  const data: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    const field: Field | undefined = fields[key];
    if (!field) throw new Error(`Template sets unknown field "${key}"`);
    if (field.kind === "list" && Array.isArray(value)) {
      data[key] = value.map((item: Record<string, unknown>) => ({
        id: newId(),
        ...mergeData(field.fields, field.newItem(), item),
      }));
    } else {
      data[key] = value;
    }
  }
  return data;
}

function toBlock(section: TemplateSection, id?: string): SectionBlock {
  const def = getSectionDef(section.type);
  if (!def) throw new Error(`Template uses unknown section type "${section.type}"`);
  const base = newSectionBlock(section.type, id);
  const block = normalizeBlock({
    ...base,
    variant: section.variant ?? base.variant,
    data: mergeData(def.fields, base.data, section.data ?? {}),
    style: section.style ?? {},
  });
  if (!block) throw new Error(`Template section "${section.type}" is invalid`);
  return block;
}

export function materializeTemplate(
  template: TemplateDefinition,
  ctx: TemplateContext,
): MaterializedSite {
  const content = template.build(ctx);
  const preset = THEME_PRESETS.find((item) => item.id === template.preset) ?? THEME_PRESETS[0]!;
  return {
    theme: normalizeTheme({ ...preset.theme, preset: preset.id }),
    header: toBlock({ type: "header", ...content.header }, "header"),
    footer: toBlock({ type: "footer", ...content.footer }, "footer"),
    pages: content.pages.map((page) => ({
      title: page.title,
      path: page.path,
      isHome: Boolean(page.isHome),
      showInNav: page.showInNav ?? true,
      blocks: page.sections.map((section) => toBlock(section)),
    })),
  };
}

/** The blank start: a homepage with a hero. */
export function materializeBlank(ctx: TemplateContext, presetId = "modern"): MaterializedSite {
  const preset = THEME_PRESETS.find((item) => item.id === presetId) ?? THEME_PRESETS[0]!;
  const hero = toBlock({
    type: "hero",
    data: { heading: ctx.tagline || `Welcome to ${ctx.name}` },
  });
  return {
    theme: normalizeTheme({ ...preset.theme, preset: preset.id }),
    header: toBlock({ type: "header" }, "header"),
    footer: toBlock({ type: "footer", data: { tagline: ctx.tagline } }, "footer"),
    pages: [{ title: "Home", path: "/", isHome: true, showInNav: true, blocks: [hero] }],
  };
}
