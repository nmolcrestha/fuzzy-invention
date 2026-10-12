"use client";

import { ChevronDownIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { ITEM_DEFS } from "@/sections/items";
import type { CustomLayout } from "@/sections/layout";
import type { SectionBlock } from "@/sections/registry";

import { ops, type Path } from "./doc-ops";
import { FieldInput } from "./field-input";
import { itemSummary } from "./item-summary";
import { LayoutStructure } from "./layout-structure";
import { useEditor } from "./store";

export const itemPath = (row: number, column: number, item: number): Path => [
  "layout",
  "rows",
  row,
  "columns",
  column,
  "items",
  item,
];

/** "Fill in" view of a built section: every item in reading order, each with its own fields. */
export function LayoutContent({ block }: { block: SectionBlock }) {
  const change = useEditor((state) => state.change);
  const layout = block.data.layout as CustomLayout;
  const [openId, setOpenId] = useState<string | null>(null);
  const many = layout.rows.length > 1 || layout.rows.some((row) => row.columns.length > 1);

  return (
    <div className="grid gap-4">
      {layout.rows.map((row, rowIndex) => (
        <div key={row.id} className="grid gap-3">
          {row.columns.map((column, columnIndex) => (
            <div key={column.id} className="grid gap-2">
              {many && (
                <p className="text-xs font-medium text-muted-foreground">
                  {layout.rows.length > 1 && `Row ${rowIndex + 1}`}
                  {layout.rows.length > 1 && row.columns.length > 1 && " · "}
                  {row.columns.length > 1 && `Column ${columnIndex + 1}`}
                </p>
              )}
              {column.items.length === 0 && (
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  This column is empty. Add items with “Customize layout”.
                </p>
              )}
              {column.items.map((item, itemIndex) => {
                const def = ITEM_DEFS[item.kind];
                const open = openId === item.id;
                const fields = Object.entries(def.fields);
                return (
                  <div
                    key={item.id}
                    className={cn("rounded-lg border", item.isHidden && "opacity-60")}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      disabled={fields.length === 0}
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="flex w-full items-center gap-2 p-2.5 text-left disabled:cursor-default"
                    >
                      <ChevronDownIcon
                        className={cn(
                          "size-4 shrink-0 transition-transform",
                          !open && "-rotate-90",
                          fields.length === 0 && "invisible",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {def.name}
                          {item.isHidden && (
                            <EyeOffIcon
                              className="size-3.5 text-muted-foreground"
                              aria-label="Hidden"
                            />
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {itemSummary(item)}
                        </span>
                      </span>
                    </button>
                    {open && (
                      <div className="grid gap-4 border-t p-3">
                        {fields.map(([key, field]) => (
                          <FieldInput
                            key={key}
                            field={field}
                            value={item.data[key]}
                            onChange={(value, options) =>
                              change(
                                (doc) =>
                                  ops.setField(
                                    doc,
                                    block.id,
                                    [...itemPath(rowIndex, columnIndex, itemIndex), "data", key],
                                    value,
                                  ),
                                options?.coalesce ? `${block.id}:${item.id}:${key}` : undefined,
                              )
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A built section's content: "Fill in" (fields) or "Customize layout" (structure, SB-20). */
export function LayoutEditor({ block }: { block: SectionBlock }) {
  const [mode, setMode] = useState<"fill" | "layout">("fill");
  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="Edit mode" className="flex gap-1 rounded-lg bg-muted p-1">
        {(
          [
            ["fill", "Fill in"],
            ["layout", "Customize layout"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className="flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "fill" ? <LayoutContent block={block} /> : <LayoutStructure block={block} />}
    </div>
  );
}
