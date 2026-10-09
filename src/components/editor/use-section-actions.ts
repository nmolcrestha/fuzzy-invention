"use client";

import { toast } from "sonner";

import { getSectionDef } from "@/sections/registry";

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
  };
}
