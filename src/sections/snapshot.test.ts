import { describe, expect, it } from "vitest";

import { parseSiteSnapshot } from "./snapshot";

describe("parseSiteSnapshot", () => {
  it("reads branding, and ignores anything that isn't a web address", () => {
    const snapshot = parseSiteSnapshot({
      name: "Bella",
      branding: {
        logo: { src: "https://cdn.example/logo.png", alt: "Bella logo" },
        favicon: "javascript:alert(1)",
        socialImage: "https://cdn.example/share.png",
      },
    });
    expect(snapshot.branding).toEqual({
      logo: { src: "https://cdn.example/logo.png", alt: "Bella logo" },
      favicon: undefined,
      socialImage: "https://cdn.example/share.png",
    });
  });

  it("keeps rendering snapshots published before branding existed", () => {
    expect(parseSiteSnapshot({ name: "Old" }).branding).toEqual({
      logo: undefined,
      favicon: undefined,
      socialImage: undefined,
    });
  });
});
