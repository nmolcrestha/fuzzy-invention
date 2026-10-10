import { describe, expect, it } from "vitest";

import { checkSections } from "@/sections/checks";
import { normalizeBlock } from "@/sections/registry";
import { pathProblem } from "@/lib/slug";

import { TEMPLATES } from "./definitions";
import { materializeBlank, materializeTemplate } from "./materialize";

const ctx = { name: "Bella Cucina", tagline: "" };

describe.each(TEMPLATES.map((template) => [template.name, template] as const))(
  "%s template",
  (_name, template) => {
    const site = materializeTemplate(template, ctx);

    it("has exactly one homepage at /", () => {
      const homes = site.pages.filter((page) => page.isHome);
      expect(homes).toHaveLength(1);
      expect(homes[0]!.path).toBe("/");
    });

    it("uses valid, unique page addresses", () => {
      for (const page of site.pages) expect(pathProblem(page.path)).toBeNull();
      expect(new Set(site.pages.map((page) => page.path)).size).toBe(site.pages.length);
    });

    it("produces blocks that pass validation unchanged", () => {
      for (const block of [
        site.header,
        site.footer,
        ...site.pages.flatMap((page) => page.blocks),
      ]) {
        expect(normalizeBlock(block)).toEqual(block);
      }
    });

    it("only links to its own pages or anchors", () => {
      const paths = new Set(site.pages.map((page) => page.path));
      for (const page of site.pages) {
        for (const link of checkSections(page.blocks).internalLinks) expect(paths).toContain(link);
      }
    });

    it("gives every list item a unique id", () => {
      const ids: string[] = [];
      const collect = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === "object") {
          if ("id" in value && typeof value.id === "string") ids.push(value.id);
          Object.values(value).forEach(collect);
        }
      };
      collect(site.pages.map((page) => page.blocks.map((block) => block.data)));
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("uses the business name", () => {
      expect(JSON.stringify(site)).toContain("Bella Cucina");
    });
  },
);

describe("blank start", () => {
  it("creates a homepage with a hero using the tagline", () => {
    const site = materializeBlank({ name: "Acme", tagline: "Rockets for everyone" });
    expect(site.pages).toHaveLength(1);
    expect(site.pages[0]!.blocks[0]!.data.heading).toBe("Rockets for everyone");
  });
});
