"use client";

import { CopyIcon, Link2Icon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SECTION_COMPONENTS, type SiteContext } from "@/sections/components";
import { newSectionBlock, PAGE_SECTION_TYPES, type SectionBlock } from "@/sections/registry";
import { themeProps } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";
import { CATEGORY_LABELS, type SectionCategory } from "@/sections/types";
import { getLibrary, removeFromLibrary } from "@/server/library/actions";
import type { LibraryItem } from "@/server/library/queries";

const THUMB_WIDTH = 1200;
const SCALE = 0.25;

/** A real render of the section (its default content, or a saved section's), scaled down. */
function SectionThumb({
  type,
  block: given,
  site,
  theme,
}: {
  type: string;
  block?: SectionBlock;
  site: SiteContext;
  theme: SiteTheme;
}) {
  const fallback = useMemo(() => newSectionBlock(type), [type]);
  const block = given ?? fallback;
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
  onLink,
  onCopy,
  beforeRemove,
  siteId,
  onPageIds,
  site,
  theme,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: string) => void;
  /** Add a saved section, linked (stays in sync) or as a copy (SEC-7). */
  onLink: (item: LibraryItem) => void;
  onCopy: (item: LibraryItem) => void;
  /** Called before removing a saved section (save pending edits); false stops it. */
  beforeRemove: () => Promise<boolean>;
  siteId: string;
  /** Sections already on this page (a linked section can only be placed once per page). */
  onPageIds: string[];
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
        {open && (
          <SavedSections
            siteId={siteId}
            onPageIds={onPageIds}
            onLink={onLink}
            onCopy={onCopy}
            beforeRemove={beforeRemove}
            site={site}
            theme={theme}
          />
        )}
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

function SavedSections({
  siteId,
  onPageIds,
  onLink,
  onCopy,
  beforeRemove,
  site,
  theme,
}: {
  siteId: string;
  onPageIds: string[];
  onLink: (item: LibraryItem) => void;
  onCopy: (item: LibraryItem) => void;
  beforeRemove: () => Promise<boolean>;
  site: SiteContext;
  theme: SiteTheme;
}) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getLibrary(siteId).then((result) => {
      if (!cancelled) setItems(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  if (items === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        Loading saved sections…
      </p>
    );
  }
  if (items.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="saved-sections-heading">
      <div>
        <h3 id="saved-sections-heading" className="text-sm font-medium text-muted-foreground">
          Saved sections
        </h3>
        <p className="text-xs text-muted-foreground">
          <strong className="font-medium">Link</strong> keeps it in sync with the other pages that
          use it. <strong className="font-medium">Copy</strong> adds a version you can edit
          separately.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const alreadyHere = onPageIds.includes(item.block.id);
          return (
            <li key={item.block.id} className="grid gap-2 rounded-xl border p-2">
              <SectionThumb type={item.block.type} block={item.block} site={site} theme={theme} />
              <div className="px-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.pages.length === 0
                    ? "Not used on any page"
                    : `Used on ${item.pages.length === 1 ? "1 page" : `${item.pages.length} pages`}: ${item.pages.map((page) => page.title).join(", ")}`}
                </p>
              </div>
              <div className="flex gap-2 px-1 pb-1">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={alreadyHere}
                  title={alreadyHere ? "It's already on this page" : undefined}
                  onClick={() => onLink(item)}
                >
                  <Link2Icon aria-hidden />
                  {alreadyHere ? "Already here" : "Link"}
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onCopy(item)}>
                  <CopyIcon aria-hidden />
                  Copy
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="icon-sm" variant="ghost">
                      <Trash2Icon aria-hidden />
                      <span className="sr-only">Remove “{item.name}” from saved sections</span>
                    </Button>
                  }
                  title={`Remove “${item.name}” from saved sections?`}
                  description="You won't be able to add it to more pages."
                  consequences={
                    item.pages.length > 0
                      ? [
                          `${item.pages.map((other) => other.title).join(", ")} keep${item.pages.length === 1 ? "s" : ""} the section, but each page gets its own copy. Editing one won't change the others.`,
                          "Nothing changes on your live website.",
                        ]
                      : ["It isn't used on any page, so it's deleted."]
                  }
                  confirmLabel="Remove from saved sections"
                  tone="destructive"
                  onConfirm={async () => {
                    if (!(await beforeRemove())) {
                      throw new Error("Your latest changes couldn't be saved yet. Try again.");
                    }
                    const result = await removeFromLibrary({ siteId, sectionId: item.block.id });
                    if (!result.ok) throw new Error(result.error);
                    // This page used it: reload so the editor works with the page's new copy.
                    if (onPageIds.includes(item.block.id)) window.location.reload();
                    else
                      setItems((current) =>
                        (current ?? []).filter((other) => other.block.id !== item.block.id),
                      );
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
