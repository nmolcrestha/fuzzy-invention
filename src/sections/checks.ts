// Pre-publish checks (requirement PUB-11). Non-blocking: they explain what visitors would see.
import { backdropProblems } from "./backdrop";
import { ITEM_DEFS } from "./items";
import type { CustomLayout } from "./layout";
import type { Field, Fields, ImageValue, LinkValue, ListItem, VideoValue } from "./fields";
import { getSectionDef, type SectionBlock } from "./registry";
import { type RichTextDoc, type RichTextNode, richTextIsEmpty } from "./rich-text";

export function fieldIsEmpty(field: Field, value: unknown): boolean {
  switch (field.kind) {
    case "text":
      return !String(value ?? "").trim();
    case "richText":
      return richTextIsEmpty(value as RichTextDoc);
    case "image":
    case "video":
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
    if (field.kind === "video") {
      const video = value as VideoValue | undefined;
      if (video?.src && !video.poster) {
        result.problems.push(
          `${where}: a video has no still image, so visitors see a blank box until it loads.`,
        );
      }
    }
    if (field.kind === "richText") {
      for (const href of richTextLinks((value as RichTextDoc | undefined)?.content)) {
        const path = linkPath(href);
        if (path) result.internalLinks.push(path);
      }
    }
    if (field.kind === "layout") {
      walkLayout(value as CustomLayout, where, result);
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

/** Built sections: every visible item's own checks, plus empty columns (SB-52). */
function walkLayout(layout: CustomLayout, where: string, result: BlockCheck) {
  layout.rows.forEach((row, rowIndex) => {
    row.columns.forEach((column, columnIndex) => {
      const visible = column.items.filter((item) => !item.isHidden);
      if (visible.length === 0 && !column.mobile.hidden) {
        result.problems.push(
          row.columns.length > 1
            ? `${where}: column ${columnIndex + 1} in row ${rowIndex + 1} is empty, so it shows as a gap.`
            : `${where}: row ${rowIndex + 1} is empty.`,
        );
      }
      for (const item of visible) {
        walk(
          ITEM_DEFS[item.kind].fields,
          item.data,
          `${where} › ${ITEM_DEFS[item.kind].name}`,
          result,
        );
      }
    });
  });
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
  if (def.placement === "page") {
    for (const problem of backdropProblems(block.style.backdrop)) {
      result.problems.push(`${def.name}: ${problem}`);
    }
  }
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
