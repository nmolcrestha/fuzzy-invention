"use client";

import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SECTION_COMPONENTS, type SiteContext } from "@/sections/components";
import { newSectionBlock, PAGE_SECTION_TYPES } from "@/sections/registry";
import { themeProps } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";
import { CATEGORY_LABELS, type SectionCategory } from "@/sections/types";

const THUMB_WIDTH = 1200;
const SCALE = 0.25;

/** A real render of the section with its default content, scaled down. */
function SectionThumb({
  type,
  site,
  theme,
}: {
  type: string;
  site: SiteContext;
  theme: SiteTheme;
}) {
  const block = useMemo(() => newSectionBlock(type), [type]);
  const Component = SECTION_COMPONENTS[type];
  if (!Component) return null;
  return (
    <div
      className="pointer-events-none h-36 overflow-hidden rounded-md border bg-white"
      aria-hidden
      inert
    >
      <div
        {...themeProps(theme)}
        className="sq-site origin-top-left"
        style={{ ...themeProps(theme).style, width: THUMB_WIDTH, transform: `scale(${SCALE})` }}
      >
        <section data-spacing="compact">
          <Component data={block.data} variant={block.variant} site={site} sectionId={block.id} />
        </section>
      </div>
    </div>
  );
}

export function SectionPicker({
  open,
  onOpenChange,
  onPick,
  site,
  theme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: string) => void;
  site: SiteContext;
  theme: SiteTheme;
}) {
  const groups = useMemo(() => {
    const byCategory = new Map<SectionCategory, typeof PAGE_SECTION_TYPES>();
    for (const def of PAGE_SECTION_TYPES) {
      byCategory.set(def.category, [...(byCategory.get(def.category) ?? []), def]);
    }
    return [...byCategory.entries()];
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
          <DialogDescription>
            Pick a starting point. You can change the text, layout and colors afterwards.
          </DialogDescription>
        </DialogHeader>
        {open &&
          groups.map(([category, defs]) => (
            <section key={category} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {CATEGORY_LABELS[category]}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {defs.map((def) => (
                  <li key={def.type}>
                    <button
                      type="button"
                      onClick={() => onPick(def.type)}
                      className="grid w-full gap-2 rounded-xl border p-2 text-left transition-colors hover:border-primary hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <SectionThumb type={def.type} site={site} theme={theme} />
                      <span className="px-1">
                        <span className="block font-medium">{def.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {def.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </DialogContent>
    </Dialog>
  );
}
