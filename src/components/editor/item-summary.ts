import { ITEM_DEFS } from "@/sections/items";
import type { LayoutItem } from "@/sections/layout";
import { plainText, type RichTextDoc } from "@/sections/rich-text";

/** A short line from the item's own content, so similar items are easy to tell apart. */
export function itemSummary(item: LayoutItem): string {
  const data = item.data as Record<string, unknown>;
  switch (item.kind) {
    case "heading":
      return String(data.text ?? "");
    case "text":
      return plainText(data.body as RichTextDoc).slice(0, 80);
    case "buttons":
      return [
        (data.primary as { label: string }).label,
        (data.secondary as { label: string }).label,
      ]
        .filter(Boolean)
        .join(" · ");
    case "image":
      return (
        (data.image as { alt: string; src: string }).alt ||
        ((data.image as { src: string }).src ? "Image" : "No image yet")
      );
    case "logos":
      return `${(data.logos as unknown[]).length} logos`;
    case "slider":
      return `${(data.slides as unknown[]).length} slides`;
    case "icons":
    case "stats":
      return `${(data.items as unknown[]).length} points`;
    default:
      return ITEM_DEFS[item.kind].description;
  }
}
