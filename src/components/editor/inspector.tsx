"use client";

import { CopyIcon, EyeIcon, GlobeIcon, MousePointerClickIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionStyle } from "@/db/schema";
import { cn } from "@/lib/utils";
import { getSectionDef } from "@/sections/registry";

import { findBlock, isChromeId, ops } from "./doc-ops";
import { FieldInput } from "./field-input";
import { useEditor } from "./store";
import { useSectionActions } from "./use-section-actions";

const BACKGROUNDS: {
  value: NonNullable<SectionStyle["background"]>;
  label: string;
  swatch: string;
}[] = [
  { value: "default", label: "Plain", swatch: "bg-white" },
  { value: "muted", label: "Soft", swatch: "bg-zinc-100" },
  { value: "primary", label: "Brand color", swatch: "bg-indigo-600" },
  { value: "dark", label: "Dark", swatch: "bg-zinc-950" },
];

const SPACINGS: { value: NonNullable<SectionStyle["spacing"]>; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Spacious" },
];

export function Inspector() {
  const selectedId = useEditor((state) => state.selectedId);
  const block = useEditor((state) =>
    state.selectedId ? findBlock(state.doc, state.selectedId) : undefined,
  );
  const change = useEditor((state) => state.change);
  const actions = useSectionActions();
  const anchorId = useId();

  if (!selectedId || !block) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <MousePointerClickIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Select a section to edit it</p>
        <p className="text-sm text-muted-foreground">
          Click a section in the preview or in the list on the left.
        </p>
      </div>
    );
  }

  const def = getSectionDef(block.type);
  if (!def) return null;
  const chrome = isChromeId(block.id);
  const visibleFields = def.fieldsForVariant?.(block.variant) ?? Object.keys(def.fields);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{def.name}</h2>
          {chrome && (
            <Badge variant="secondary" className="gap-1">
              <GlobeIcon className="size-3" aria-hidden />
              Every page
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {chrome
            ? `Changes to the ${def.name.toLowerCase()} appear on every page of your website.`
            : def.description}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {block.isHidden && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p>This section is hidden. Visitors won&apos;t see it.</p>
            <Button size="sm" variant="outline" onClick={() => actions.toggleHidden(block.id)}>
              <EyeIcon aria-hidden />
              Show
            </Button>
          </div>
        )}

        {def.variants.length > 1 && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Layout</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {def.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={block.variant === variant.id}
                  onClick={() => change((doc) => ops.setVariant(doc, block.id, variant.id))}
                  className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:font-medium"
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <section className="grid gap-5" aria-label="Content">
          <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
          {visibleFields.map((key) => {
            const field = def.fields[key];
            if (!field) return null;
            return (
              <FieldInput
                key={`${block.id}:${key}`}
                field={field}
                value={block.data[key]}
                onChange={(value, options) =>
                  change(
                    (doc) => ops.setField(doc, block.id, [key], value),
                    options?.coalesce ? `${block.id}:${key}` : undefined,
                  )
                }
              />
            );
          })}
        </section>

        <section className="grid gap-4" aria-label="Style">
          <h3 className="text-sm font-medium text-muted-foreground">Style</h3>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Background</legend>
            <div role="radiogroup" className="grid grid-cols-4 gap-2">
              {BACKGROUNDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={(block.style.background ?? "default") === option.value}
                  onClick={() =>
                    change((doc) => ops.setStyle(doc, block.id, { background: option.value }))
                  }
                  className="group grid justify-items-center gap-1 text-xs"
                >
                  <span
                    className={cn(
                      "size-9 rounded-full border-2 border-border ring-offset-2 group-aria-checked:ring-2 group-aria-checked:ring-primary",
                      option.swatch,
                    )}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {!chrome && (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Spacing</legend>
                <div role="radiogroup" className="flex gap-1 rounded-lg bg-muted p-1">
                  {SPACINGS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={(block.style.spacing ?? "normal") === option.value}
                      onClick={() =>
                        change((doc) => ops.setStyle(doc, block.id, { spacing: option.value }))
                      }
                      className="flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Advanced
                </summary>
                <div className="mt-3 grid gap-2">
                  <Label htmlFor={anchorId}>Section link name</Label>
                  <Input
                    id={anchorId}
                    value={block.style.anchorId ?? ""}
                    placeholder="e.g. pricing"
                    maxLength={40}
                    onChange={(event) =>
                      change(
                        (doc) =>
                          ops.setStyle(doc, block.id, {
                            anchorId: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                          }),
                        `${block.id}:anchor`,
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Lets buttons and menus jump straight here with #{block.style.anchorId || "name"}
                    .
                  </p>
                </div>
              </details>
            </>
          )}
        </section>
      </div>

      {!chrome && (
        <div className="flex gap-2 border-t p-3">
          <Button variant="outline" className="flex-1" onClick={() => actions.duplicate(block.id)}>
            <CopyIcon aria-hidden />
            Duplicate
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => actions.remove(block.id)}>
            <Trash2Icon aria-hidden />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
