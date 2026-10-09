import { describe, expect, it } from "vitest";

import { chromeBlock, newSectionBlock, normalizeBlock, SECTION_DEFS } from "./registry";
import { richTextDocSchema, safeHref } from "./rich-text";

describe("section registry", () => {
  it("creates every section type with valid defaults", () => {
    for (const type of Object.keys(SECTION_DEFS)) {
      const block = newSectionBlock(type);
      expect(normalizeBlock(block)).toEqual(block);
    }
  });

  it("gives list items fresh ids for each new section", () => {
    const a = newSectionBlock("features").data.items as { id: string }[];
    const b = newSectionBlock("features").data.items as { id: string }[];
    expect(a[0]!.id).not.toBe(b[0]!.id);
  });

  it("fills missing fields with defaults and drops unknown keys", () => {
    const block = normalizeBlock({
      id: "x",
      type: "cta",
      variant: "card",
      data: { heading: "Hi", extra: 1 },
    });
    expect(block?.data).toMatchObject({
      heading: "Hi",
      text: expect.any(String),
      button: expect.any(Object),
    });
    expect(block?.data).not.toHaveProperty("extra");
  });

  it("replaces invalid values instead of failing the save", () => {
    const block = normalizeBlock({
      id: "x",
      type: "hero",
      variant: "split",
      data: { heading: 42, image: { src: "javascript:alert(1)", alt: "x" } },
    });
    expect(block?.data.heading).toBe("Say what you do in one clear sentence");
    expect((block?.data.image as { src: string }).src).toBe("");
  });

  it("rejects unknown types and variants", () => {
    expect(normalizeBlock({ id: "x", type: "nope", variant: "a", data: {} })).toBeNull();
    expect(normalizeBlock({ id: "x", type: "hero", variant: "nope", data: {} })).toBeNull();
  });

  it("falls back to default header/footer", () => {
    expect(chromeBlock("header", null).type).toBe("header");
    expect(
      chromeBlock("footer", { variant: "columns", data: { tagline: "Hi" } }).data.tagline,
    ).toBe("Hi");
  });
});

describe("rich text", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["mailto:a@b.co", "mailto:a@b.co"],
    ["/about", "/about"],
    ["#faq", "#faq"],
    ["javascript:alert(1)", null],
    ["//evil.example", null],
    ["data:text/html,hi", null],
  ])("safeHref(%s) → %s", (href, expected) => {
    expect(safeHref(href)).toBe(expected);
  });

  it("rejects unknown node types", () => {
    const doc = { type: "doc", content: [{ type: "image", attrs: { src: "x" } }] };
    expect(richTextDocSchema.safeParse(doc).success).toBe(false);
  });
});
