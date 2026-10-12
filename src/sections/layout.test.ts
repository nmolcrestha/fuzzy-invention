import { describe, expect, it } from "vitest";

import { checkBlock } from "./checks";
import { ITEM_KINDS } from "./items";
import {
  type CustomLayout,
  layoutItems,
  layoutSchema,
  LIMITS,
  newColumn,
  newItem,
  newRow,
} from "./layout";
import { findItem, layoutOps } from "./layout-ops";
import { buildPreset, GOALS, PRESETS } from "./presets";
import { newSectionBlock, normalizeBlock } from "./registry";

const twoColumns = (): CustomLayout => ({
  preset: "text-media",
  rows: [
    newRow("1/2+1/2", [
      newColumn([newItem("heading"), newItem("text")]),
      newColumn([newItem("image")]),
    ]),
  ],
});

describe("layout schema", () => {
  it("drops unknown items and fixes column counts instead of failing", () => {
    const parsed = layoutSchema.parse({
      preset: "x",
      rows: [
        {
          id: "r",
          split: "1/3x3",
          columns: [
            {
              id: "c",
              items: [
                { id: "a", kind: "heading", data: { text: "Hi" } },
                { id: "b", kind: "laser", data: {} },
              ],
            },
          ],
        },
      ],
    });
    const row = parsed.rows[0]!;
    expect(row.columns).toHaveLength(3);
    expect(row.columns[0]!.items.map((item) => item.kind)).toEqual(["heading"]);
    expect(row.columns[0]!.items[0]!.data).toMatchObject({ text: "Hi", size: "large" });
    expect(row.columns[0]!.align).toBe("start");
  });

  it("enforces the limits", () => {
    const rows = Array.from({ length: LIMITS.rows + 1 }, () => newRow("1"));
    expect(layoutSchema.safeParse({ preset: "x", rows }).success).toBe(false);
  });

  it("round-trips every preset through section validation", () => {
    for (const id of Object.keys(PRESETS)) {
      const preset = buildPreset(id)!;
      const block = {
        ...newSectionBlock("custom"),
        data: { layout: preset.layout },
        style: preset.style,
      };
      expect(normalizeBlock(block)).toEqual(block);
    }
  });

  it("can create every item kind", () => {
    for (const kind of ITEM_KINDS) {
      const layout = { preset: "blank", rows: [newRow("1", [newColumn([newItem(kind)])])] };
      expect(layoutSchema.parse(layout)).toEqual(layout);
    }
  });
});

describe("presets", () => {
  it("point the guided questions at real items", () => {
    for (const id of Object.keys(PRESETS)) {
      const { layout, slots } = buildPreset(id)!;
      const ids = new Set(layoutItems(layout).map(({ item }) => item.id));
      for (const slot of [slots.headline, slots.text, slots.buttons]) {
        if (slot) expect(ids.has(slot)).toBe(true);
      }
      if (slots.media && slots.media !== "backdrop") expect(ids.has(slots.media)).toBe(true);
    }
  });

  it("give every goal at least one design that exists", () => {
    for (const goal of GOALS) {
      expect(goal.presets.length).toBeGreaterThan(0);
      for (const id of goal.presets) expect(id.startsWith("section:") || id in PRESETS).toBe(true);
    }
  });

  it("build fresh ids every time", () => {
    const a = buildPreset("image-hero")!.layout.rows[0]!.id;
    const b = buildPreset("image-hero")!.layout.rows[0]!.id;
    expect(a).not.toBe(b);
  });
});

describe("layout ops", () => {
  it("never loses content when a row loses columns", () => {
    const layout = twoColumns();
    const next = layoutOps.setSplit(layout, 0, "1");
    expect(next.rows[0]!.columns).toHaveLength(1);
    expect(next.rows[0]!.columns[0]!.items.map((item) => item.kind)).toEqual([
      "heading",
      "text",
      "image",
    ]);
    expect(layoutOps.setSplit(next, 0, "1/3x3").rows[0]!.columns).toHaveLength(3);
  });

  it("moves items within and between columns", () => {
    const layout = twoColumns();
    const image = layout.rows[0]!.columns[1]!.items[0]!;
    const moved = layoutOps.moveItem(layout, findItem(layout, image.id)!, {
      row: 0,
      column: 0,
      item: 0,
    });
    expect(moved.rows[0]!.columns[0]!.items[0]!.id).toBe(image.id);
    expect(moved.rows[0]!.columns[1]!.items).toHaveLength(0);

    const reordered = layoutOps.moveItem(
      moved,
      { row: 0, column: 0, item: 0 },
      { row: 0, column: 0, item: 2 },
    );
    expect(reordered.rows[0]!.columns[0]!.items.at(-1)!.id).toBe(image.id);
  });

  it("respects the item limit", () => {
    let layout: CustomLayout = { preset: "blank", rows: [newRow("1")] };
    for (let i = 0; i < LIMITS.items + 2; i++) layout = layoutOps.addItem(layout, 0, 0, "text")[0];
    expect(layout.rows[0]!.columns[0]!.items).toHaveLength(LIMITS.items);
    expect(layoutOps.addItem(layout, 0, 0, "text")[1]).toBeNull();
  });

  it("duplicates rows and items with new ids", () => {
    const layout = twoColumns();
    const rows = layoutOps.duplicateRow(layout, 0).rows;
    expect(rows).toHaveLength(2);
    expect(rows[1]!.id).not.toBe(rows[0]!.id);
    expect(rows[1]!.columns[0]!.items[0]!.id).not.toBe(rows[0]!.columns[0]!.items[0]!.id);
    const [withCopy, copyId] = layoutOps.duplicateItem(layout, { row: 0, column: 0, item: 0 });
    expect(withCopy.rows[0]!.columns[0]!.items[1]!.id).toBe(copyId);
  });

  it("keeps at least one row and returns the same layout when nothing changes", () => {
    const layout = twoColumns();
    expect(layoutOps.removeRow(layout, 0)).toBe(layout);
    expect(layoutOps.moveRow(layout, 0, 0)).toBe(layout);
    expect(layoutOps.setSplit(layout, 0, "1/2+1/2")).toBe(layout);
  });

  it("resets to the starting design but keeps the content", () => {
    const layout = twoColumns();
    const heading = layout.rows[0]!.columns[0]!.items[0]!;
    heading.data = { ...heading.data, text: "Kept" };
    const messy = layoutOps.addRow(layoutOps.setSplit(layout, 0, "1"), "1/3x3");
    const reset = layoutOps.resetToPreset(messy);
    expect(reset.rows.map((row) => row.split)).toEqual(["1/2+1/2"]);
    const headings = layoutItems(reset).filter(({ item }) => item.kind === "heading");
    expect(headings[0]!.item.data.text).toBe("Kept");
  });
});

describe("built section checks", () => {
  it("flags empty columns and checks each item's fields", () => {
    const layout: CustomLayout = {
      preset: "blank",
      rows: [newRow("1/2+1/2", [newColumn([newItem("image")]), newColumn()])],
    };
    const block = { ...newSectionBlock("custom"), data: { layout } };
    const problems = checkBlock(block).problems;
    expect(problems).toContain("Built section: column 2 in row 1 is empty, so it shows as a gap.");
    expect(problems).toContain("Built section › Image: “Image” is empty.");
  });
});
