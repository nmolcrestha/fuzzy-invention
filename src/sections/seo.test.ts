import { describe, expect, it } from "vitest";

import { newSectionBlock } from "./registry";
import { richText } from "./rich-text";
import { autoDescription, cleanSeo, pageSeoSchema, sameSeo, seoProblems, seoTitle } from "./seo";

describe("page SEO", () => {
  it("stores only what's set", () => {
    const parsed = pageSeoSchema.parse({ title: "  Pricing  ", description: "", noindex: false });
    expect(cleanSeo(parsed)).toEqual({ title: "Pricing" });
    expect(cleanSeo(pageSeoSchema.parse({ noindex: true, image: "https://x.dev/a.png" }))).toEqual({
      image: "https://x.dev/a.png",
      noindex: true,
    });
  });

  it("rejects images that aren't web addresses", () => {
    expect(pageSeoSchema.safeParse({ image: "javascript:alert(1)" }).success).toBe(false);
  });

  it("treats missing and empty values as the same", () => {
    expect(sameSeo({}, { title: "", noindex: false })).toBe(true);
    expect(sameSeo({ title: "A" }, {})).toBe(false);
  });

  it("builds the title from the page and site name", () => {
    expect(seoTitle({ title: "Menu", isHome: false, seo: {} }, "Bella")).toBe("Menu · Bella");
    expect(seoTitle({ title: "Home", isHome: true, seo: {} }, "Bella")).toBe("Bella");
    expect(seoTitle({ title: "Menu", isHome: false, seo: { title: "Our menu" } }, "Bella")).toBe(
      "Our menu",
    );
  });

  it("describes a page from its first longer visible text", () => {
    const hidden = { ...newSectionBlock("text"), isHidden: true };
    hidden.data = { ...hidden.data, body: richText("Hidden text that is long enough to be used.") };
    const visible = newSectionBlock("text");
    visible.data = {
      ...visible.data,
      body: richText("Fresh pasta made by hand every single morning."),
    };
    expect(autoDescription([hidden, visible])).toBe(
      "Fresh pasta made by hand every single morning.",
    );
  });

  it("warns about long titles and descriptions, and hidden pages", () => {
    expect(seoProblems({})).toEqual([]);
    expect(
      seoProblems({ title: "x".repeat(61), description: "y".repeat(161), noindex: true }),
    ).toHaveLength(3);
  });
});
