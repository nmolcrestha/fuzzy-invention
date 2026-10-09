import type { PageDocument } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";

/** Messages between the editor (parent) and the preview iframe. Same-origin only. */
export type ToPreview =
  | { type: "sq:doc"; doc: PageDocument }
  | { type: "sq:selection"; selectedId: string | null; hoveredId: string | null }
  | { type: "sq:scroll"; id: string }
  | { type: "sq:theme"; theme: SiteTheme };

export type FromPreview =
  | { type: "sq:ready" }
  | { type: "sq:select"; id: string }
  | { type: "sq:hover"; id: string | null };

export function isMessage<T extends { type: string }>(
  event: MessageEvent,
  prefix = "sq:",
): event is MessageEvent<T> {
  return (
    event.origin === window.location.origin &&
    typeof event.data === "object" &&
    event.data !== null &&
    typeof event.data.type === "string" &&
    event.data.type.startsWith(prefix)
  );
}
