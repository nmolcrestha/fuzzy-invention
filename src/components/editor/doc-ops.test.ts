import { describe, expect, it } from "vitest";

import { chromeBlock, newSectionBlock } from "@/sections/registry";
import type { PageDocument } from "@/sections/site-page";

import { getIn, ops, setIn } from "./doc-ops";
import { createEditorStore, unsavedParts } from "./store";

function makeDoc(): PageDocument {
  return {
    header: chromeBlock("header", null),
    footer: chromeBlock("footer", null),
    sections: [newSectionBlock("hero"), newSectionBlock("features")],
  };
}

describe("setIn / getIn", () => {
  it("updates nested values without mutating", () => {
    const original = { items: [{ title: "a" }, { title: "b" }] };
    const next = setIn(original, ["items", 1, "title"], "c");
    expect(getIn(next, ["items", 1, "title"])).toBe("c");
    expect(original.items[1]!.title).toBe("b");
    expect(next.items[0]).toBe(original.items[0]); // untouched parts keep identity
  });
});

describe("doc ops", () => {
  it("duplicates a section with new ids for the section and its list items", () => {
    const doc = makeDoc();
    const features = doc.sections[1]!;
    const [next, copy] = ops.duplicate(doc, features.id);
    expect(next.sections).toHaveLength(3);
    expect(next.sections[2]).toBe(copy);
    expect(copy!.id).not.toBe(features.id);
    const ids = (block: typeof copy) =>
      (block!.data.items as { id: string }[]).map((item) => item.id);
    expect(ids(copy)).not.toEqual(ids(features));
  });

  it("moves and removes sections", () => {
    const doc = makeDoc();
    const moved = ops.move(doc, 0, 1);
    expect(moved.sections.map((block) => block.type)).toEqual(["features", "hero"]);
    expect(ops.remove(moved, moved.sections[0]!.id).sections.map((block) => block.type)).toEqual([
      "hero",
    ]);
  });
});

describe("editor store", () => {
  it("undoes and redoes, merging rapid typing into one step", () => {
    const doc = makeDoc();
    const store = createEditorStore({ doc, revisions: { page: 0, design: 0 } });
    const heroId = doc.sections[0]!.id;
    const { change } = store.getState();

    change((d) => ops.setField(d, heroId, ["heading"], "H"), `${heroId}:heading`);
    change((d) => ops.setField(d, heroId, ["heading"], "He"), `${heroId}:heading`);
    change((d) => ops.setField(d, heroId, ["heading"], "Hey"), `${heroId}:heading`);
    expect(store.getState().past).toHaveLength(1);

    store.getState().undo();
    expect(store.getState().doc.sections[0]!.data.heading).toBe(doc.sections[0]!.data.heading);
    store.getState().redo();
    expect(store.getState().doc.sections[0]!.data.heading).toBe("Hey");
  });

  it("tracks unsaved page and design parts separately", () => {
    const doc = makeDoc();
    const store = createEditorStore({ doc, revisions: { page: 0, design: 0 } });
    expect(unsavedParts(store.getState())).toEqual({ page: false, design: false });

    store.getState().change((d) => ops.setVariant(d, "header", "centered"));
    expect(unsavedParts(store.getState())).toEqual({ page: false, design: true });

    store.getState().undo();
    expect(unsavedParts(store.getState())).toEqual({ page: false, design: false });
  });

  it("clears the selection when undo removes the selected section", () => {
    const doc = makeDoc();
    const store = createEditorStore({ doc, revisions: { page: 0, design: 0 } });
    let added = "";
    store.getState().change((d) => {
      const [next, block] = ops.insert(d, "cta", 0);
      added = block.id;
      return next;
    });
    store.getState().select(added);
    store.getState().undo();
    expect(store.getState().selectedId).toBeNull();
  });
});
