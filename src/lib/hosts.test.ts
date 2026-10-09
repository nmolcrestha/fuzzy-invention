import { describe, expect, it } from "vitest";

import { normalizeLivePath, subdomainFromHost } from "./hosts";

describe("subdomainFromHost", () => {
  it.each([
    ["bella.localhost:3000", "localhost:3000", "bella"],
    ["Bella.Builder.app", "builder.app", "bella"],
    ["localhost:3000", "localhost:3000", null],
    ["www.builder.app", "builder.app", null],
    ["a.b.builder.app", "builder.app", null],
    ["evilbuilder.app", "builder.app", null],
    ["bella.other.app", "builder.app", null],
    [null, "builder.app", null],
  ])("%s on %s → %s", (host, root, expected) => {
    expect(subdomainFromHost(host, root)).toBe(expected);
  });
});

describe("normalizeLivePath", () => {
  it.each([
    ["/", "/"],
    ["", "/"],
    ["/Menu/", "/menu"],
    ["/services//Web%20Design", "/services/web design"],
    ["/%E0%A4%A", "/%e0%a4%a"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeLivePath(input)).toBe(expected);
  });
});
