import { describe, expect, it } from "vitest";

import {
  normalizePath,
  pathFromTitle,
  pathProblem,
  slugify,
  subdomainProblem,
  suggestSubdomain,
  uniqueVariant,
} from "./slug";

describe("slugify", () => {
  it.each([
    ["Bella Cucina", "bella-cucina"],
    ["  Café Déjà Vu  ", "cafe-deja-vu"],
    ["Fish & Chips!", "fish-and-chips"],
    ["---", ""],
    ["Acme   SaaS 2.0", "acme-saas-2-0"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("trims to max length without a trailing dash", () => {
    expect(slugify("aaaa bbbb", 5)).toBe("aaaa");
  });
});

describe("subdomains", () => {
  it("accepts a normal subdomain", () => {
    expect(subdomainProblem("bella-cucina")).toBeNull();
  });

  it.each(["ab", "Bella", "bella_cucina", "-bella", "bella-", "bel--la", "www", "a".repeat(41)])(
    "rejects %s",
    (value) => {
      expect(subdomainProblem(value)).not.toBeNull();
    },
  );

  it("suggests from a name and pads short ones", () => {
    expect(suggestSubdomain("Bella Cucina")).toBe("bella-cucina");
    expect(suggestSubdomain("AB")).toBe("ab-site");
    expect(suggestSubdomain("!!!")).toBe("my-site");
  });
});

describe("page paths", () => {
  it("builds a path from a title", () => {
    expect(pathFromTitle("About us")).toBe("/about-us");
    expect(pathFromTitle("???")).toBe("/page");
  });

  it("normalizes user input", () => {
    expect(normalizePath("About Us/")).toBe("/about-us");
    expect(normalizePath("/services//Web Design")).toBe("/services/web-design");
    expect(normalizePath("")).toBe("/");
  });

  it.each(["/", "/about", "/services/web-design"])("accepts %s", (path) => {
    expect(pathProblem(path)).toBeNull();
  });

  it.each(["about", "/About", "/api", "/_next/x", "/a--b"])("rejects %s", (path) => {
    expect(pathProblem(path)).not.toBeNull();
  });
});

describe("uniqueVariant", () => {
  it("adds a numeric suffix until free", () => {
    const taken = new Set(["/about", "/about-2"]);
    expect(uniqueVariant("/about", (c) => taken.has(c))).toBe("/about-3");
    expect(uniqueVariant("/menu", (c) => taken.has(c))).toBe("/menu");
  });
});
