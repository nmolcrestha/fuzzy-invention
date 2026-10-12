"use client";

import { toast } from "sonner";

import { withFreshIds } from "@/sections/fields";
import { getSectionDef, type SectionBlock } from "@/sections/registry";
import type { LibraryItem } from "@/server/library/queries";

import { ops } from "./doc-ops";
import { useEditorStore } from "./store";

const UNDO_MS = 8000;

/** Section-level actions with the feedback rules from requirement §8.2. */
export function useSectionActions() {
  const store = useEditorStore();
  const { change, select, requestScroll } = store.getState();

  return {
    insert(type: string, index: number) {
      let id = "";
      change((doc) => {
        const [next, block] = ops.insert(doc, type, index);
        id = block.id;
        return next;
      });
      select(id);
      // Give the preview a frame to render the new section before scrolling to it.
      setTimeout(() => requestScroll(id), 50);
    },

    duplicate(id: string) {
      let copyId = "";
      change((doc) => {
        const [next, copy] = ops.duplicate(doc, id);
        copyId = copy?.id ?? "";
        return next;
      });
      if (copyId) {
        select(copyId);
        setTimeout(() => requestScroll(copyId), 50);
      }
    },

    toggleHidden(id: string) {
      const block = store.getState().doc.sections.find((section) => section.id === id);
      if (!block) return;
      change((doc) => ops.toggleHidden(doc, id));
      const name = getSectionDef(block.type)?.name ?? "Section";
      toast(
        block.isHidden
          ? `${name} is visible again.`
          : `${name} is hidden. Visitors won't see it, but it's kept here.`,
        {
          id: `hidden-${id}`,
        },
      );
    },

    remove(id: string) {
      const { doc } = store.getState();
      const index = doc.sections.findIndex((section) => section.id === id);
      const block = doc.sections[index];
      if (!block) return;
      change((current) => ops.remove(current, id));
      if (store.getState().selectedId === id) select(null);
      const name = getSectionDef(block.type)?.name ?? "Section";
      toast(`Deleted the ${name} section.`, {
        duration: UNDO_MS,
        action: {
          label: "Undo",
          onClick: () => {
            change((current) => {
              if (current.sections.some((section) => section.id === block.id)) return current;
              const sections = [...current.sections];
              sections.splice(Math.min(index, sections.length), 0, block);
              return { ...current, sections };
            });
            select(block.id);
            setTimeout(() => requestScroll(block.id), 50);
          },
        },
      });
    },

    move(from: number, to: number) {
      change((doc) => ops.move(doc, from, to));
    },

    /** Adds a section made with "Build your own" (SB-3 to SB-5). */
    insertBuilt(block: SectionBlock, index: number, complete: boolean) {
      change((doc) => ops.insertBlock(doc, block, index));
      select(block.id);
      setTimeout(() => requestScroll(block.id), 50);
      if (complete) {
        // A one-time look at the phone version (SB-4).
        store.getState().setDevice("mobile");
        toast("This is how it looks on phones: columns stack automatically.", {
          duration: UNDO_MS,
          action: {
            label: "Back to desktop",
            onClick: () => store.getState().setDevice("desktop"),
          },
        });
      } else {
        toast("Added the section with what you filled in. Finish it in the settings panel.", {
          duration: UNDO_MS,
          action: {
            label: "Undo",
            onClick: () => change((doc) => ops.remove(doc, block.id)),
          },
        });
      }
    },

    /** Adds a saved section that stays in sync everywhere it's used (SEC-7 "Link"). */
    link(item: LibraryItem, index: number) {
      const block = { ...item.block, isHidden: false };
      store.getState().setShared(block, item);
      change((doc) => ops.insertBlock(doc, block, index));
      select(block.id);
      setTimeout(() => requestScroll(block.id), 50);
      toast(`Added “${item.name}”. Edits here also change it on the other pages that use it.`);
    },

    /** Adds an independent copy of a saved section (SEC-7 "Copy"). */
    copy(item: LibraryItem, index: number) {
      const block = {
        ...structuredClone(item.block),
        id: globalThis.crypto.randomUUID(),
        data: withFreshIds(structuredClone(item.block.data)),
        isHidden: false,
      };
      change((doc) => ops.insertBlock(doc, block, index));
      select(block.id);
      setTimeout(() => requestScroll(block.id), 50);
    },

    /** Turns a shared section into one that only belongs to this page (SEC-8). */
    detach(id: string) {
      let copyId = "";
      change((doc) => {
        const [next, copy] = ops.detach(doc, id);
        copyId = copy?.id ?? "";
        return next;
      });
      if (!copyId) return;
      select(copyId);
      toast("Detached. Changes to this section now only apply to this page.", {
        duration: UNDO_MS,
        action: { label: "Undo", onClick: () => store.getState().undo() },
      });
    },
  };
}
