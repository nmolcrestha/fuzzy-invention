import { describe, expect, it } from "vitest";

import { usesImage, withoutImage } from "./media-refs";

const URL = "https://example.com/media/sites/1/photo.png";

describe("usesImage / withoutImage", () => {
  const data = {
    heading: "Hello",
    image: { src: URL, alt: "A photo" },
    members: [
      { id: "1", photo: { src: URL, alt: "Ada" } },
      { id: "2", photo: { src: "https://other.example/x.png", alt: "Bob" } },
    ],
  };

  it("finds the image at any depth", () => {
    expect(usesImage(data, URL)).toBe(true);
    expect(usesImage({ heading: "Hello" }, URL)).toBe(false);
    expect(usesImage({ favicon: URL }, URL)).toBe(true);
  });

  it("empties every use and keeps unrelated parts untouched", () => {
    const next = withoutImage(data, URL);
    expect(next.image).toEqual({ src: "", alt: "" });
    expect(next.members[0]!.photo).toEqual({ src: "", alt: "" });
    expect(next.members[1]).toBe(data.members[1]);
    expect(usesImage(next, URL)).toBe(false);
  });

  it("returns the same object when nothing uses the image", () => {
    const other = { heading: "x", image: { src: "https://other.example/y.png", alt: "" } };
    expect(withoutImage(other, URL)).toBe(other);
  });

  it("clears bare URLs (favicon, social image)", () => {
    expect(withoutImage({ favicon: URL, contactEmail: "a@b.c" }, URL)).toEqual({
      favicon: "",
      contactEmail: "a@b.c",
    });
  });
});
