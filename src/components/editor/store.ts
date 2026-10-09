"use client";

import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";

import type { PageDocument } from "@/sections/site-page";

const HISTORY_LIMIT = 100;
/** Typing in the same field within this window counts as one undo step. */
const COALESCE_MS = 1000;

export type SaveStatus =
  | { state: "saved" }
  | { state: "pending" }
  | { state: "saving" }
  | { state: "error"; message: string; retryInMs: number }
  | { state: "offline" }
  | { state: "conflict"; message: string };

export type Device = "desktop" | "tablet" | "mobile";

type EditorState = {
  doc: PageDocument;
  /** The last document parts the server confirmed. Compared by identity to find unsaved work. */
  saved: {
    sections: PageDocument["sections"];
    header: PageDocument["header"];
    footer: PageDocument["footer"];
  };
  revisions: { page: number; design: number };
  selectedId: string | null;
  hoveredId: string | null;
  device: Device;
  past: PageDocument[];
  future: PageDocument[];
  lastChange: { key: string | null; at: number };
  status: SaveStatus;
  /** Ask the preview to scroll a section into view (nonce makes repeated requests distinct). */
  scrollRequest: { id: string; nonce: number } | null;

  /** Applies a change. Pass `coalesceKey` (e.g. "id:field") to merge rapid typing into one undo step. */
  change: (fn: (doc: PageDocument) => PageDocument, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setDevice: (device: Device) => void;
  setStatus: (status: SaveStatus) => void;
  requestScroll: (id: string) => void;
  markSaved: (
    sent: Partial<EditorState["saved"]>,
    revisions: { page: number | null; design: number | null },
  ) => void;
};

export function createEditorStore(init: {
  doc: PageDocument;
  revisions: { page: number; design: number };
}) {
  return createStore<EditorState>()((set, get) => ({
    doc: init.doc,
    saved: { sections: init.doc.sections, header: init.doc.header, footer: init.doc.footer },
    revisions: init.revisions,
    selectedId: null,
    hoveredId: null,
    device: "desktop",
    past: [],
    future: [],
    lastChange: { key: null, at: 0 },
    status: { state: "saved" },
    scrollRequest: null,

    change: (fn, coalesceKey) => {
      const { doc, past, lastChange } = get();
      const next = fn(doc);
      if (next === doc) return;
      const now = Date.now();
      const coalesce =
        coalesceKey != null && coalesceKey === lastChange.key && now - lastChange.at < COALESCE_MS;
      set({
        doc: next,
        past: coalesce ? past : [...past, doc].slice(-HISTORY_LIMIT),
        future: [],
        lastChange: { key: coalesceKey ?? null, at: now },
      });
    },

    undo: () => {
      const { past, doc, future } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set({
        doc: previous,
        past: past.slice(0, -1),
        future: [doc, ...future].slice(0, HISTORY_LIMIT),
        lastChange: { key: null, at: 0 },
      });
      keepSelectionValid(set, get);
    },

    redo: () => {
      const { past, doc, future } = get();
      const next = future[0];
      if (!next) return;
      set({
        doc: next,
        past: [...past, doc],
        future: future.slice(1),
        lastChange: { key: null, at: 0 },
      });
      keepSelectionValid(set, get);
    },

    select: (id) => set({ selectedId: id }),
    hover: (id) => set({ hoveredId: id }),
    setDevice: (device) => set({ device }),
    setStatus: (status) => set({ status }),
    requestScroll: (id) => set({ scrollRequest: { id, nonce: Date.now() } }),

    markSaved: (sent, revisions) =>
      set((state) => ({
        saved: { ...state.saved, ...sent },
        revisions: {
          page: revisions.page ?? state.revisions.page,
          design: revisions.design ?? state.revisions.design,
        },
      })),
  }));
}

function keepSelectionValid(set: (partial: Partial<EditorState>) => void, get: () => EditorState) {
  const { selectedId, doc } = get();
  if (
    selectedId &&
    selectedId !== "header" &&
    selectedId !== "footer" &&
    !doc.sections.some((block) => block.id === selectedId)
  ) {
    set({ selectedId: null });
  }
}

/** What still needs saving, by comparing identities with the last saved parts. */
export function unsavedParts(state: Pick<EditorState, "doc" | "saved">) {
  return {
    page: state.doc.sections !== state.saved.sections,
    design: state.doc.header !== state.saved.header || state.doc.footer !== state.saved.footer,
  };
}

export type EditorStore = ReturnType<typeof createEditorStore>;
export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor must be used inside the editor");
  return useStore(store, selector);
}

export function useEditorStore(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore must be used inside the editor");
  return store;
}
