"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { type FromPreview, isMessage, type ToPreview } from "./preview-protocol";
import { type Device, useEditor, useEditorStore } from "./store";

const WIDTHS: Record<Device, string> = { desktop: "100%", tablet: "820px", mobile: "390px" };

export function PreviewFrame({ pageId }: { pageId: string }) {
  const store = useEditorStore();
  const device = useEditor((state) => state.device);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Messages from the preview: ready / click-to-select / hover.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || !isMessage<FromPreview>(event)) return;
      const message = event.data;
      if (message.type === "sq:ready") setReady(true);
      else if (message.type === "sq:select") store.getState().select(message.id);
      else if (message.type === "sq:hover") store.getState().hover(message.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [store]);

  // Keep the preview in sync with the editor (batched per animation frame).
  useEffect(() => {
    if (!ready) return;
    const post = (message: ToPreview) =>
      iframe.current?.contentWindow?.postMessage(message, window.location.origin);
    const initial = store.getState();
    post({ type: "sq:doc", doc: initial.doc });
    post({ type: "sq:selection", selectedId: initial.selectedId, hoveredId: initial.hoveredId });

    let frame = 0;
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.scrollRequest && state.scrollRequest !== previous.scrollRequest) {
        post({ type: "sq:scroll", id: state.scrollRequest.id });
      }
      if (
        state.doc === previous.doc &&
        state.selectedId === previous.selectedId &&
        state.hoveredId === previous.hoveredId
      ) {
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const latest = store.getState();
        post({ type: "sq:doc", doc: latest.doc });
        post({ type: "sq:selection", selectedId: latest.selectedId, hoveredId: latest.hoveredId });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [ready, store]);

  return (
    <div
      className={cn(
        "relative flex h-full justify-center overflow-hidden bg-muted/60",
        device !== "desktop" && "p-4",
      )}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Loading preview…
        </div>
      )}
      <iframe
        ref={iframe}
        src={`/preview/${pageId}?embed=1`}
        title="Page preview"
        style={{ width: WIDTHS[device] }}
        className={cn(
          "h-full max-w-full bg-white transition-[width] duration-300",
          device !== "desktop" && "rounded-xl border shadow-sm",
          !ready && "opacity-0",
        )}
      />
    </div>
  );
}
