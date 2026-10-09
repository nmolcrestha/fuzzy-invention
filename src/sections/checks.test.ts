import { describe, expect, it } from "vitest";

import { checkBlock, checkSections } from "./checks";
import { newSectionBlock } from "./registry";
import { richText } from "./rich-text";

describe("pre-publish checks", () => {
  it("passes fresh default sections apart from buttons without a destination", () => {
    const cta = newSectionBlock("cta");
    expect(checkBlock(cta).problems).toEqual([
      "Call to action: the “Get in touch” button doesn't go anywhere yet.",
    ]);
  });

  it("flags empty required fields and collects internal links", () => {
    const hero = newSectionBlock("hero");
    hero.data.heading = " ";
    hero.data.primaryCta = { label: "See the menu", href: "/menu#mains" };
    hero.data.subheading = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "About", marks: [{ type: "link", attrs: { href: "/about/" } }] },
          ],
        },
      ],
    };
    const check = checkBlock(hero);
    expect(check.problems).toContain("Hero: “Headline” is empty.");
    expect(check.internalLinks.sort()).toEqual(["/about", "/menu"]);
  });

  it("checks fields inside list items", () => {
    const faq = newSectionBlock("faq");
    (faq.data.items as { question: string; answer: unknown }[])[0]!.answer =
      richText("Go to /start");
    const withLink = { ...faq, data: { ...faq.data } };
    expect(checkBlock(withLink).problems).toEqual([]);
  });

  it("ignores fields hidden by the chosen layout", () => {
    const hero = newSectionBlock("hero"); // centered: image not shown
    hero.data.primaryCta = { label: "Book", href: "/book" };
    hero.data.image = { src: "https://example.com/a.jpg", alt: "" };
    expect(checkBlock(hero).problems).toEqual([]);
    expect(checkBlock({ ...hero, variant: "split" }).problems).toHaveLength(1);
  });

  it("warns about empty pages and skips hidden sections", () => {
    const hidden = { ...newSectionBlock("cta"), isHidden: true };
    expect(checkSections([hidden]).problems).toEqual([
      "This page has no visible sections, so visitors will see an empty page.",
    ]);
  });
});
