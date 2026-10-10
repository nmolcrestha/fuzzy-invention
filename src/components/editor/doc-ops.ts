// Pure, immutable operations on the editor document. Unchanged parts keep their identity,
// which the store relies on to tell what still needs saving.
import type { SectionStyle } from "@/db/schema";
import { withFreshIds } from "@/sections/fields";
import { newSectionBlock, type SectionBlock } from "@/sections/registry";
import type { PageDocument } from "@/sections/site-page";

export type Path = (string | number)[];

export const CHROME_IDS = ["header", "footer"] as const;
export const isChromeId = (id: string): id is "header" | "footer" =>
  id === "header" || id === "footer";

/** Immutably sets a nested value: setIn({a:[{b:1}]}, ["a",0,"b"], 2). */
export function setIn<T>(target: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T;
  const [key, ...rest] = path;
  if (Array.isArray(target)) {
    const copy = [...target];
    copy[key as number] = setIn(copy[key as number], rest, value);
    return copy as T;
  }
  const record = (target ?? {}) as Record<string, unknown>;
  return { ...record, [key as string]: setIn(record[key as string], rest, value) } as T;
}

export function getIn(target: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (current, key) => (current as Record<string | number, unknown>)?.[key],
    target,
  );
}

export function findBlock(doc: PageDocument, id: string): SectionBlock | undefined {
  if (id === "header") return doc.header;
  if (id === "footer") return doc.footer;
  return doc.sections.find((block) => block.id === id);
}

export function updateBlock(
  doc: PageDocument,
  id: string,
  fn: (block: SectionBlock) => SectionBlock,
): PageDocument {
  if (id === "header") return { ...doc, header: fn(doc.header) };
  if (id === "footer") return { ...doc, footer: fn(doc.footer) };
  return { ...doc, sections: doc.sections.map((block) => (block.id === id ? fn(block) : block)) };
}

export const ops = {
  setField: (doc: PageDocument, id: string, path: Path, value: unknown) =>
    updateBlock(doc, id, (block) => ({ ...block, data: setIn(block.data, path, value) })),

  setVariant: (doc: PageDocument, id: string, variant: string) =>
    updateBlock(doc, id, (block) => ({ ...block, variant })),

  setStyle: (doc: PageDocument, id: string, patch: Partial<SectionStyle>) =>
    updateBlock(doc, id, (block) => ({ ...block, style: { ...block.style, ...patch } })),

  toggleHidden: (doc: PageDocument, id: string) =>
    updateBlock(doc, id, (block) => ({ ...block, isHidden: !block.isHidden })),

  insert: (doc: PageDocument, type: string, index: number): [PageDocument, SectionBlock] => {
    const block = newSectionBlock(type);
    const sections = [...doc.sections];
    sections.splice(Math.max(0, Math.min(index, sections.length)), 0, block);
    return [{ ...doc, sections }, block];
  },

  duplicate: (doc: PageDocument, id: string): [PageDocument, SectionBlock | null] => {
    const index = doc.sections.findIndex((block) => block.id === id);
    if (index === -1) return [doc, null];
    const source = doc.sections[index]!;
    const copy: SectionBlock = {
      ...structuredClone(source),
      id: globalThis.crypto.randomUUID(),
      style: { ...source.style, anchorId: undefined },
    };
    // List items (at any depth) need new ids too, so React keys and drag handles stay unique.
    copy.data = withFreshIds(copy.data);
    const sections = [...doc.sections];
    sections.splice(index + 1, 0, copy);
    return [{ ...doc, sections }, copy];
  },

  remove: (doc: PageDocument, id: string) => ({
    ...doc,
    sections: doc.sections.filter((block) => block.id !== id),
  }),

  move: (doc: PageDocument, from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= doc.sections.length ||
      to >= doc.sections.length
    )
      return doc;
    const sections = [...doc.sections];
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved!);
    return { ...doc, sections };
  },
};
