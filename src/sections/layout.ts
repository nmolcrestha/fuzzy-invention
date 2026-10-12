// A built section's structure (requirements SB-20, SB-21, SB-26, SB-50, SB-51):
// Section → Rows → Columns → Items, on a fixed grid. Spacing and sizes come from the design,
// never from pixel values. Schemas and pure helpers only, no React.
import { z } from "zod";

import type { LayoutField } from "./fields";
import { withFreshIds } from "./fields";
import { isItemKind, type ItemKind, newItemData, parseItemData } from "./items";

/** Column splits users can choose (fractions of the row's width). */
export const SPLITS = [
  { id: "1", label: "One column", columns: 1 },
  { id: "1/2+1/2", label: "Two equal columns", columns: 2 },
  { id: "2/3+1/3", label: "Wide and narrow", columns: 2 },
  { id: "1/3+2/3", label: "Narrow and wide", columns: 2 },
  { id: "1/3x3", label: "Three columns", columns: 3 },
  { id: "1/4x4", label: "Four columns", columns: 4 },
] as const;

export type SplitId = (typeof SPLITS)[number]["id"];
const SPLIT_IDS = SPLITS.map((split) => split.id) as [SplitId, ...SplitId[]];

export const LIMITS = { rows: 6, columns: 4, items: 12 } as const;

export type Align = "start" | "center" | "end";
export type ColumnBackground = "none" | "soft" | "brand" | "card";

export type LayoutItem = {
  id: string;
  kind: ItemKind;
  data: Record<string, unknown>;
  align?: Align;
  isHidden?: boolean;
};

export type LayoutColumn = {
  id: string;
  align: Align;
  valign: Align;
  background: ColumnBackground;
  mobile: { hidden: boolean; first: boolean };
  items: LayoutItem[];
};

export type LayoutRow = { id: string; split: SplitId; columns: LayoutColumn[] };

export type CustomLayout = {
  /** The starting design ("Reset to the starting design" restores its structure). */
  preset: string;
  rows: LayoutRow[];
};

export function splitColumns(split: SplitId): number {
  return SPLITS.find((option) => option.id === split)?.columns ?? 1;
}

const id = z.string().min(1).max(64);
const align = z.enum(["start", "center", "end"]);

const itemSchema = z
  .object({
    id,
    kind: z.string().max(20),
    data: z.unknown(),
    align: align.optional().catch(undefined),
    isHidden: z.boolean().optional().catch(undefined),
  })
  .transform((item, ctx): LayoutItem | typeof z.NEVER => {
    if (!isItemKind(item.kind)) {
      ctx.addIssue({ code: "custom", message: "unknown item" });
      return z.NEVER;
    }
    return {
      id: item.id,
      kind: item.kind,
      data: parseItemData(item.kind, item.data),
      ...(item.align && { align: item.align }),
      ...(item.isHidden && { isHidden: true }),
    };
  });

/** Keeps the valid items and drops anything unknown, so one bad item never breaks a section. */
const itemsSchema = z
  .array(z.unknown())
  .catch([])
  .transform((items) =>
    items.flatMap((item) => {
      const parsed = itemSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  )
  .pipe(z.array(z.custom<LayoutItem>()).max(LIMITS.items));

const columnSchema = z.object({
  id,
  align: align.catch("start"),
  valign: align.catch("start"),
  background: z.enum(["none", "soft", "brand", "card"]).catch("none"),
  mobile: z
    .object({ hidden: z.boolean().catch(false), first: z.boolean().catch(false) })
    .catch({ hidden: false, first: false }),
  items: itemsSchema,
});

const rowSchema = z
  .object({
    id,
    split: z.enum(SPLIT_IDS).catch("1"),
    columns: z.array(columnSchema).max(LIMITS.columns),
  })
  .transform((row): LayoutRow => {
    // A row always has exactly as many columns as its split.
    const count = splitColumns(row.split);
    const columns = row.columns.slice(0, count);
    while (columns.length < count) columns.push(newColumn());
    return { ...row, columns };
  });

export const layoutSchema = z.object({
  preset: z.string().max(40).catch("blank"),
  rows: z.array(rowSchema).min(1).max(LIMITS.rows),
});

const newId = () => globalThis.crypto.randomUUID();

export function newItem(kind: ItemKind, data?: Record<string, unknown>): LayoutItem {
  return { id: newId(), kind, data: data ?? newItemData(kind) };
}

export function newColumn(
  items: LayoutItem[] = [],
  patch: Partial<LayoutColumn> = {},
): LayoutColumn {
  return {
    id: newId(),
    align: "start",
    valign: "start",
    background: "none",
    mobile: { hidden: false, first: false },
    items,
    ...patch,
  };
}

export function newRow(split: SplitId, columns?: LayoutColumn[]): LayoutRow {
  const count = splitColumns(split);
  const filled = columns ?? [];
  return {
    id: newId(),
    split,
    columns: Array.from({ length: count }, (_, index) => filled[index] ?? newColumn()),
  };
}

export const BLANK_LAYOUT: CustomLayout = {
  preset: "blank",
  rows: [newRow("1", [newColumn([newItem("heading"), newItem("text")])])],
};

/** The layout field of the `custom` section type. */
export function layoutField(opts: { label: string; default: CustomLayout }): LayoutField {
  const fallback = opts.default;
  return {
    kind: "layout",
    label: opts.label,
    schema: layoutSchema.catch(() =>
      withFreshIds(structuredClone(fallback)),
    ) as unknown as LayoutField["schema"],
    default: fallback as unknown as Record<string, unknown>,
  };
}

/** Every item with where it sits, in reading order. */
export function layoutItems(layout: CustomLayout) {
  return layout.rows.flatMap((row, rowIndex) =>
    row.columns.flatMap((column, columnIndex) =>
      column.items.map((item, itemIndex) => ({ item, rowIndex, columnIndex, itemIndex })),
    ),
  );
}

/** Count of items in the whole section. */
export function itemCount(layout: CustomLayout): number {
  return layoutItems(layout).length;
}
