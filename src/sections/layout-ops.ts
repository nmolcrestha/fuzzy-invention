// Pure, immutable edits to a built section's layout (requirements SB-20 to SB-26, SB-51).
// Every operation respects the limits and returns the same object when nothing changes.
import { withFreshIds } from "./fields";
import type { ItemKind } from "./items";
import {
  type Align,
  type CustomLayout,
  LIMITS,
  type LayoutColumn,
  type LayoutItem,
  type LayoutRow,
  newColumn,
  newItem,
  newRow,
  splitColumns,
  type SplitId,
} from "./layout";
import { buildPreset } from "./presets";

export type ItemAt = { row: number; column: number; item: number };

const replaceAt = <T>(list: T[], index: number, value: T) =>
  list.map((entry, position) => (position === index ? value : entry));

function updateRow(layout: CustomLayout, row: number, fn: (row: LayoutRow) => LayoutRow) {
  const current = layout.rows[row];
  if (!current) return layout;
  const next = fn(current);
  return next === current ? layout : { ...layout, rows: replaceAt(layout.rows, row, next) };
}

/** A deep copy with new ids for it and everything inside it. */
const freshCopy = <T extends { id: string }>(value: T): T =>
  withFreshIds([structuredClone(value)])[0]!;

function updateColumn(
  layout: CustomLayout,
  row: number,
  column: number,
  fn: (column: LayoutColumn) => LayoutColumn,
) {
  return updateRow(layout, row, (current) => {
    const target = current.columns[column];
    if (!target) return current;
    const next = fn(target);
    return next === target
      ? current
      : { ...current, columns: replaceAt(current.columns, column, next) };
  });
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry!);
  return next;
}

export const layoutOps = {
  // ---------- rows ----------
  addRow(layout: CustomLayout, split: SplitId, at = layout.rows.length): CustomLayout {
    if (layout.rows.length >= LIMITS.rows) return layout;
    const rows = [...layout.rows];
    rows.splice(at, 0, newRow(split));
    return { ...layout, rows };
  },

  removeRow(layout: CustomLayout, row: number): CustomLayout {
    if (layout.rows.length <= 1 || !layout.rows[row]) return layout;
    return { ...layout, rows: layout.rows.filter((_, index) => index !== row) };
  },

  duplicateRow(layout: CustomLayout, row: number): CustomLayout {
    const source = layout.rows[row];
    if (!source || layout.rows.length >= LIMITS.rows) return layout;
    const copy = freshCopy(source);
    const rows = [...layout.rows];
    rows.splice(row + 1, 0, copy);
    return { ...layout, rows };
  },

  moveRow(layout: CustomLayout, from: number, to: number): CustomLayout {
    const rows = move(layout.rows, from, to);
    return rows === layout.rows ? layout : { ...layout, rows };
  },

  /**
   * Changes a row's column split. Content is never lost: when columns go away, their items move
   * into the last remaining column (as far as the item limit allows).
   */
  setSplit(layout: CustomLayout, row: number, split: SplitId): CustomLayout {
    return updateRow(layout, row, (current) => {
      if (current.split === split) return current;
      const count = splitColumns(split);
      const kept = current.columns.slice(0, count);
      const extra = current.columns.slice(count).flatMap((column) => column.items);
      while (kept.length < count) kept.push(newColumn());
      if (extra.length > 0) {
        const last = kept[count - 1]!;
        kept[count - 1] = { ...last, items: [...last.items, ...extra].slice(0, LIMITS.items) };
      }
      return { ...current, split, columns: kept };
    });
  },

  // ---------- columns ----------
  setColumn(
    layout: CustomLayout,
    row: number,
    column: number,
    patch: Partial<Pick<LayoutColumn, "align" | "valign" | "background" | "mobile">>,
  ): CustomLayout {
    return updateColumn(layout, row, column, (current) => ({ ...current, ...patch }));
  },

  // ---------- items ----------
  addItem(
    layout: CustomLayout,
    row: number,
    column: number,
    kind: ItemKind,
  ): [CustomLayout, string | null] {
    const target = layout.rows[row]?.columns[column];
    if (!target || target.items.length >= LIMITS.items) return [layout, null];
    const item = newItem(kind);
    return [
      updateColumn(layout, row, column, (current) => ({
        ...current,
        items: [...current.items, item],
      })),
      item.id,
    ];
  },

  updateItem(layout: CustomLayout, at: ItemAt, fn: (item: LayoutItem) => LayoutItem): CustomLayout {
    return updateColumn(layout, at.row, at.column, (current) => {
      const target = current.items[at.item];
      return target
        ? { ...current, items: replaceAt(current.items, at.item, fn(target)) }
        : current;
    });
  },

  removeItem(layout: CustomLayout, at: ItemAt): CustomLayout {
    return updateColumn(layout, at.row, at.column, (current) => ({
      ...current,
      items: current.items.filter((_, index) => index !== at.item),
    }));
  },

  duplicateItem(layout: CustomLayout, at: ItemAt): [CustomLayout, string | null] {
    const column = layout.rows[at.row]?.columns[at.column];
    const source = column?.items[at.item];
    if (!column || !source || column.items.length >= LIMITS.items) return [layout, null];
    const copy = freshCopy(source);
    return [
      updateColumn(layout, at.row, at.column, (current) => {
        const items = [...current.items];
        items.splice(at.item + 1, 0, copy);
        return { ...current, items };
      }),
      copy.id,
    ];
  },

  toggleItemHidden(layout: CustomLayout, at: ItemAt): CustomLayout {
    return layoutOps.updateItem(layout, at, (item) => ({ ...item, isHidden: !item.isHidden }));
  },

  setItemAlign(layout: CustomLayout, at: ItemAt, align: Align | undefined): CustomLayout {
    return layoutOps.updateItem(layout, at, (item) => {
      const next = { ...item };
      if (align) next.align = align;
      else delete next.align;
      return next;
    });
  },

  /** Moves an item within its column, or into another column or row (at `to.item`). */
  moveItem(layout: CustomLayout, from: ItemAt, to: ItemAt): CustomLayout {
    const source = layout.rows[from.row]?.columns[from.column];
    const target = layout.rows[to.row]?.columns[to.column];
    const item = source?.items[from.item];
    if (!source || !target || !item) return layout;

    if (from.row === to.row && from.column === to.column) {
      const items = move(source.items, from.item, Math.min(to.item, source.items.length - 1));
      return items === source.items
        ? layout
        : updateColumn(layout, from.row, from.column, (current) => ({ ...current, items }));
    }
    if (target.items.length >= LIMITS.items) return layout;
    const removed = updateColumn(layout, from.row, from.column, (current) => ({
      ...current,
      items: current.items.filter((_, index) => index !== from.item),
    }));
    return updateColumn(removed, to.row, to.column, (current) => {
      const items = [...current.items];
      items.splice(Math.max(0, Math.min(to.item, items.length)), 0, item);
      return { ...current, items };
    });
  },

  /**
   * "Reset to the starting design" (SB-25): rebuilds the design's rows and columns, and pours
   * the existing content back in, matching items by kind in reading order. Items the design has
   * no place for are added to its last column, so nothing is lost.
   */
  resetToPreset(layout: CustomLayout): CustomLayout {
    const preset = buildPreset(layout.preset);
    if (!preset) return layout;
    const remaining = layout.rows.flatMap((row) => row.columns.flatMap((column) => column.items));
    const take = (kind: ItemKind) => {
      const index = remaining.findIndex((item) => item.kind === kind);
      return index === -1 ? null : remaining.splice(index, 1)[0]!;
    };
    const rows = preset.layout.rows.map((row) => ({
      ...row,
      columns: row.columns.map((column) => ({
        ...column,
        items: column.items.map((item) => {
          const existing = take(item.kind);
          return existing ? { ...item, data: existing.data, isHidden: existing.isHidden } : item;
        }),
      })),
    }));
    if (remaining.length > 0) {
      const lastRow = rows.at(-1)!;
      const lastColumn = lastRow.columns.at(-1)!;
      lastColumn.items = [...lastColumn.items, ...remaining].slice(0, LIMITS.items);
    }
    return { preset: layout.preset, rows };
  },
};

/** Where an item is, by id. */
export function findItem(layout: CustomLayout, itemId: string): ItemAt | null {
  for (const [row, entry] of layout.rows.entries()) {
    for (const [column, col] of entry.columns.entries()) {
      const item = col.items.findIndex((candidate) => candidate.id === itemId);
      if (item !== -1) return { row, column, item };
    }
  }
  return null;
}

/** Where a column is, by id. */
export function findColumn(
  layout: CustomLayout,
  columnId: string,
): { row: number; column: number } | null {
  for (const [row, entry] of layout.rows.entries()) {
    const column = entry.columns.findIndex((candidate) => candidate.id === columnId);
    if (column !== -1) return { row, column };
  }
  return null;
}
