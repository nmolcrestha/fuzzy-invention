// Pre-publish checks (requirement PUB-11). Non-blocking: they explain what visitors would see.
import type { Field, Fields, ImageValue, LinkValue, ListItem } from "./fields";
import { getSectionDef, type SectionBlock } from "./registry";
import { type RichTextDoc, type RichTextNode, richTextIsEmpty } from "./rich-text";

export function fieldIsEmpty(field: Field, value: unknown): boolean {
  switch (field.kind) {
    case "text":
      return !String(value ?? "").trim();
    case "richText":
      return richTextIsEmpty(value as RichTextDoc);
    case "image":
      return !(value as ImageValue | undefined)?.src;
    case "link":
      return !(value as LinkValue | undefined)?.label?.trim();
    default:
      return false;
  }
}

export type BlockCheck = {
  problems: string[];
  /** Site-relative paths this block links to, e.g. "/menu" (anchors and queries removed). */
  internalLinks: string[];
};

function linkPath(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function richTextLinks(nodes: RichTextNode[] = [], out: string[] = []): string[] {
  for (const node of nodes) {
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && mark.attrs?.href) out.push(mark.attrs.href);
    }
    richTextLinks(node.content, out);
  }
  return out;
}

function walk(fields: Fields, data: Record<string, unknown>, where: string, result: BlockCheck) {
  for (const [key, field] of Object.entries(fields)) {
    const value = data[key];
    if (field.required && fieldIsEmpty(field, value)) {
      result.problems.push(`${where}: “${field.label}” is empty.`);
    }
    if (field.kind === "link") {
      const link = value as LinkValue | undefined;
      if (link?.label?.trim() && !link.href.trim()) {
        result.problems.push(
          `${where}: the “${link.label.trim()}” button doesn't go anywhere yet.`,
        );
      }
      const path = link?.label?.trim() ? linkPath(link.href.trim()) : null;
      if (path) result.internalLinks.push(path);
    }
    if (field.kind === "image") {
      const image = value as ImageValue | undefined;
      if (image?.src && !image.alt.trim()) {
        result.problems.push(
          `${where}: an image has no description (people using screen readers won't know what it shows).`,
        );
      }
    }
    if (field.kind === "richText") {
      for (const href of richTextLinks((value as RichTextDoc | undefined)?.content)) {
        const path = linkPath(href);
        if (path) result.internalLinks.push(path);
      }
    }
    if (field.kind === "list") {
      const items = (Array.isArray(value) ? value : []) as ListItem[];
      items.forEach((item, index) => {
        const title =
          String(item[field.titleField] ?? "").trim() || `${field.itemLabel} ${index + 1}`;
        walk(field.fields, item, `${where} › ${title}`, result);
      });
    }
  }
}

/** Problems and internal links for one section, the header or the footer. */
export function checkBlock(block: SectionBlock): BlockCheck {
  const result: BlockCheck = { problems: [], internalLinks: [] };
  const def = getSectionDef(block.type);
  if (!def || block.isHidden) return result;
  const visible = def.fieldsForVariant?.(block.variant);
  const fields = visible
    ? Object.fromEntries(Object.entries(def.fields).filter(([key]) => visible.includes(key)))
    : def.fields;
  walk(fields, block.data, def.name, result);
  return result;
}

/** Combined checks for a page's sections. */
export function checkSections(blocks: SectionBlock[]): BlockCheck {
  const visible = blocks.filter((block) => !block.isHidden);
  const result: BlockCheck = { problems: [], internalLinks: [] };
  if (visible.length === 0)
    result.problems.push("This page has no visible sections, so visitors will see an empty page.");
  for (const block of visible) {
    const check = checkBlock(block);
    result.problems.push(...check.problems);
    result.internalLinks.push(...check.internalLinks);
  }
  result.internalLinks = [...new Set(result.internalLinks)];
  return result;
}
