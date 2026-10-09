// Rich text is stored as Tiptap JSON, validated against an allow-list and rendered by our own
// renderer (rich-text-view.tsx). We never store or inject raw HTML.
import { z } from "zod";

export type RichMark = "bold" | "italic" | "link";
export type RichBlock = "paragraph" | "heading" | "bulletList" | "orderedList";

export type RichTextMark = { type: RichMark; attrs?: { href?: string } };
export type RichTextNode = {
  type: string;
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
};
export type RichTextDoc = { type: "doc"; content: RichTextNode[] };

/** Only these link targets are allowed: http(s), mailto, tel, site-relative paths and #anchors. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  return null;
}

const markSchema = z.object({
  type: z.enum(["bold", "italic", "link"]),
  attrs: z
    .object({ href: z.string().max(2000).optional() })
    .loose()
    .optional(),
});

const MAX_NODES = 2000;

const nodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.enum([
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "listItem",
      "text",
      "hardBreak",
    ]),
    text: z.string().max(10_000).optional(),
    marks: z.array(markSchema).max(10).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).max(500).optional(),
  }),
);

export const richTextDocSchema = z
  .object({ type: z.literal("doc"), content: z.array(nodeSchema).max(500) })
  .refine((doc) => countNodes(doc.content) <= MAX_NODES, "This text is too long.");

function countNodes(nodes: RichTextNode[] = []): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.content), 0);
}

export function richText(...paragraphs: string[]): RichTextDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

export function richTextIsEmpty(doc: RichTextDoc | undefined): boolean {
  return !doc || plainText(doc).trim() === "";
}

export function plainText(doc: RichTextDoc | RichTextNode): string {
  if ("text" in doc && doc.text) return doc.text;
  return (doc.content ?? []).map(plainText).join(" ");
}
