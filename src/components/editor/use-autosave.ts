"use client";

import { useEffect, useState } from "react";

import { saveDraft } from "@/server/editor/actions";

import { type EditorStore, sharedIsDirty, unsavedParts } from "./store";

const DEBOUNCE_MS = 800;
const MAX_RETRY_MS = 30_000;

/**
 * Saves the editor document shortly after every change.
 * - One request at a time; changes made during a save are picked up right after.
 * - Network/server errors retry with backoff; going offline waits for the connection.
 * - A revision conflict (another tab saved first) stops saving until the user reloads.
 */
export function createAutosaver(pageId: string, store: EditorStore) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let attempt = 0;
  let stopped = false;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const schedule = (ms: number) => {
    clearTimer();
    timer = setTimeout(() => void save(), ms);
  };
  const hasUnsaved = () => {
    const parts = unsavedParts(store.getState());
    return parts.page || parts.design;
  };

  async function save(): Promise<void> {
    clearTimer();
    if (stopped) return;
    if (inFlight) {
      await inFlight;
      return save();
    }

    const state = store.getState();
    const parts = unsavedParts(state);
    if (!parts.page && !parts.design) {
      state.setStatus({ state: "saved" });
      return;
    }
    if (!navigator.onLine) {
      state.setStatus({ state: "offline" });
      return;
    }

    const { doc, revisions, shared } = state;
    // Shared sections say which revision they started from, and whether they were edited here.
    const sections = doc.sections.map((block) => {
      const entry = shared[block.id];
      return entry
        ? { ...block, shared: { revision: entry.revision, dirty: sharedIsDirty(block, entry) } }
        : block;
    });
    const sent = {
      ...(parts.page && { sections: doc.sections }),
      ...(parts.design && { header: doc.header, footer: doc.footer }),
    };
    state.setStatus({ state: "saving" });

    inFlight = (async () => {
      try {
        const result = await saveDraft({
          pageId,
          ...(parts.page && { page: { revision: revisions.page, sections } }),
          ...(parts.design && {
            design: { revision: revisions.design, header: doc.header, footer: doc.footer },
          }),
        });

        if (result.ok) {
          attempt = 0;
          store
            .getState()
            .markSaved(
              sent,
              { page: result.data.pageRevision, design: result.data.designRevision },
              result.data.sharedRevisions,
            );
          store.getState().setStatus({ state: hasUnsaved() ? "pending" : "saved" });
        } else if (result.code === "conflict") {
          stopped = true;
          store.getState().setStatus({ state: "conflict", message: result.error });
        } else {
          retryLater(result.error);
        }
      } catch {
        // The request itself failed (network drop, server restart).
        if (!navigator.onLine) store.getState().setStatus({ state: "offline" });
        else retryLater("We couldn't reach the server.");
      }
    })();

    await inFlight;
    inFlight = null;

    // Anything changed while we were saving? Save again soon.
    if (!stopped && store.getState().status.state === "pending" && hasUnsaved()) {
      schedule(DEBOUNCE_MS);
    }
  }

  function retryLater(message: string) {
    attempt += 1;
    const retryInMs = Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt);
    store.getState().setStatus({ state: "error", message, retryInMs });
    schedule(retryInMs);
  }

  /** Call on every document change. */
  function onChange() {
    if (stopped) return;
    if (!hasUnsaved()) {
      // e.g. undo back to the saved state
      if (!inFlight) store.getState().setStatus({ state: "saved" });
      clearTimer();
      return;
    }
    const current = store.getState().status.state;
    if (current !== "saving" && current !== "error")
      store.getState().setStatus({ state: "pending" });
    schedule(DEBOUNCE_MS);
  }

  /** Saves now; resolves to true when everything is saved. */
  async function flush() {
    await save();
    return !hasUnsaved();
  }

  return {
    save,
    flush,
    onChange,
    isBusy: () => hasUnsaved() || inFlight !== null,
    dispose: clearTimer,
  };
}

export function useAutosave(pageId: string, store: EditorStore) {
  const [saver] = useState(() => createAutosaver(pageId, store));

  useEffect(() => {
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.doc !== previous.doc) saver.onChange();
    });
    const onOnline = () => void saver.save();
    const onOffline = () => {
      if (saver.isBusy()) store.getState().setStatus({ state: "offline" });
    };
    // Warn before closing the tab with unsaved work.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saver.isBusy()) {
        event.preventDefault();
        void saver.save();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      saver.dispose();
    };
  }, [saver, store]);

  return { flush: saver.flush, retryNow: saver.save };
}
