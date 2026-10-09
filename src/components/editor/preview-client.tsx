"use client";

import { useEffect, useState } from "react";

import type { SiteContext } from "@/sections/components";
import { type PageDocument, SitePage } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";

import { type FromPreview, isMessage, type ToPreview } from "./preview-protocol";

/**
 * Renders a draft page. Inside the editor iframe it follows the editor's live document and
 * reports clicks/hovers so sections can be selected right in the preview.
 */
export function PreviewClient({
  initialDoc,
  initialTheme,
  site,
  embedded,
  selectable,
  sectionNames,
}: {
  initialDoc: PageDocument;
  initialTheme: SiteTheme;
  site: SiteContext;
  /** Inside an editor iframe: follows postMessage updates. */
  embedded: boolean;
  /** Clicking selects sections (editor). Off for the Design tab, which only shows the page. */
  selectable: boolean;
  sectionNames: Record<string, string>;
}) {
  const [doc, setDoc] = useState(initialDoc);
  const [theme, setTheme] = useState(initialTheme);
  const [selection, setSelection] = useState<{
    selectedId: string | null;
    hoveredId: string | null;
  }>({
    selectedId: null,
    hoveredId: null,
  });

  useEffect(() => {
    if (!embedded) return;
    const post = (message: FromPreview) =>
      window.parent.postMessage(message, window.location.origin);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !isMessage<ToPreview>(event)) return;
      const message = event.data;
      if (message.type === "sq:doc") setDoc(message.doc);
      else if (message.type === "sq:theme") setTheme(message.theme);
      else if (message.type === "sq:selection") setSelection(message);
      else if (message.type === "sq:scroll") {
        document
          .querySelector(`[data-sq-id="${CSS.escape(message.id)}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const blockId = (target: EventTarget | null) =>
      target instanceof Element
        ? (target.closest("[data-sq-id]")?.getAttribute("data-sq-id") ?? null)
        : null;

    const onClick = (event: MouseEvent) => {
      // In the editor, clicks select sections instead of following links or opening FAQs.
      event.preventDefault();
      const id = blockId(event.target);
      if (id) post({ type: "sq:select", id });
    };
    let lastHover: string | null = null;
    const onMove = (event: MouseEvent) => {
      const id = blockId(event.target);
      if (id !== lastHover) {
        lastHover = id;
        post({ type: "sq:hover", id });
      }
    };
    const onLeave = () => {
      lastHover = null;
      post({ type: "sq:hover", id: null });
    };

    const onLinkClick = (event: MouseEvent) => event.preventDefault();

    window.addEventListener("message", onMessage);
    if (selectable) {
      document.addEventListener("click", onClick, true);
      document.addEventListener("mousemove", onMove);
      document.documentElement.addEventListener("mouseleave", onLeave);
    } else {
      document.addEventListener("click", onLinkClick, true);
    }
    post({ type: "sq:ready" });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("click", onLinkClick, true);
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [embedded, selectable]);

  useEffect(() => {
    if (embedded) return;
    // Standalone draft preview: internal links don't work until pages are published (Phase 3).
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link && !/^(https?:|mailto:|tel:)/.test(link.getAttribute("href") ?? ""))
        event.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [embedded]);

  const highlight = (id: string | null, style: string) =>
    id ? `[data-sq-id="${CSS.escape(id)}"]{${style}}` : "";

  return (
    <>
      {embedded && selectable && (
        <style>
          {`[data-sq-id]{position:relative;cursor:pointer}` +
            highlight(selection.hoveredId, "outline:2px dashed #6366f1;outline-offset:-2px") +
            highlight(selection.selectedId, "outline:2px solid #4f46e5;outline-offset:-2px") +
            (selection.selectedId
              ? `[data-sq-id="${CSS.escape(selection.selectedId)}"]::after{content:"${cssString(
                  sectionNames[blockType(doc, selection.selectedId)] ?? "Section",
                )}";position:absolute;top:0;left:0;z-index:50;background:#4f46e5;color:#fff;font:600 12px/1 system-ui,sans-serif;padding:6px 8px;border-bottom-right-radius:6px}`
              : "")}
        </style>
      )}
      {!embedded && (
        <div className="sticky top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Draft preview. Only you can see this. Links to other pages work once they&apos;re
          published.
        </div>
      )}
      <SitePage doc={doc} site={site} theme={theme} />
    </>
  );
}

function blockType(doc: PageDocument, id: string) {
  if (id === "header" || id === "footer") return id;
  return doc.sections.find((block) => block.id === id)?.type ?? "";
}

function cssString(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}
