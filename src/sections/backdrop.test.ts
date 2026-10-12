import { describe, expect, it } from "vitest";

import {
  backdropProblems,
  backdropSchema,
  contrastWithText,
  DEFAULT_OVERLAY,
  effectiveTone,
  luminanceUnderOverlay,
  overlayColor,
} from "./backdrop";
import { normalizeBlock, newSectionBlock } from "./registry";

const image = (strength = 0.5, tone: "dark" | "light" | "brand" = "dark") => ({
  kind: "image" as const,
  src: "https://cdn.example/photo.jpg",
  focal: { x: 0.5, y: 0.5 },
  overlay: { tone, strength },
});

describe("backdrops", () => {
  it("picks the text tone from the overlay or gradient", () => {
    expect(effectiveTone({ background: "muted" })).toBe("muted");
    expect(effectiveTone({ background: "muted", backdrop: image(0.5, "dark") })).toBe("dark");
    expect(effectiveTone({ backdrop: image(0.5, "light") })).toBe("light");
    expect(effectiveTone({ backdrop: image(0.5, "brand") })).toBe("primary");
    expect(effectiveTone({ backdrop: { kind: "gradient", preset: "night" } })).toBe("dark");
    // An image that hasn't been chosen yet doesn't change anything.
    expect(effectiveTone({ background: "muted", backdrop: { ...image(), src: "" } })).toBe("muted");
  });

  it("repairs bad stored values instead of failing", () => {
    expect(
      backdropSchema.parse({
        kind: "image",
        src: "javascript:alert(1)",
        focal: { x: 7 },
        overlay: { tone: "neon" },
      }),
    ).toEqual({ kind: "image", src: "", focal: { x: 0.5, y: 0.5 }, overlay: DEFAULT_OVERLAY });
  });

  it("keeps sections valid with and without a backdrop", () => {
    const hero = newSectionBlock("hero");
    expect(normalizeBlock({ ...hero, style: { background: "dark" } })?.style).toEqual({
      background: "dark",
    });
    expect(normalizeBlock({ ...hero, style: { backdrop: image() } })?.style.backdrop).toEqual(
      image(),
    );
    expect(
      normalizeBlock({ ...hero, style: { backdrop: { kind: "laser" } } })?.style.backdrop,
    ).toBeUndefined();
  });

  it("flags missing media, missing posters and weak overlays", () => {
    expect(backdropProblems(undefined)).toEqual([]);
    expect(backdropProblems({ kind: "gradient", preset: "brand" })).toEqual([]);
    expect(backdropProblems(image(0.5))).toEqual([]);
    expect(backdropProblems(image(0.1))).toEqual([
      "the overlay on the background is light, so the text may be hard to read.",
    ]);
    expect(backdropProblems({ ...image(), src: "" })[0]).toContain("hasn't been chosen");
    expect(
      backdropProblems({
        kind: "video",
        src: "https://cdn.example/a.mp4",
        poster: "",
        overlay: DEFAULT_OVERLAY,
      })[0],
    ).toContain("no still image");
  });

  it("estimates readability over a photo", () => {
    // A bright photo under a weak dark overlay stays bright: white text fails.
    const bright = luminanceUnderOverlay(0.9, { tone: "dark", strength: 0.1 });
    expect(contrastWithText(bright, 0.95)).toBeLessThan(3);
    // A strong dark overlay fixes it.
    const darkened = luminanceUnderOverlay(0.9, { tone: "dark", strength: 0.7 });
    expect(contrastWithText(darkened, 0.95)).toBeGreaterThan(3);
  });

  it("mixes the overlay color with transparency", () => {
    expect(overlayColor({ tone: "dark", strength: 0.45 })).toBe(
      "color-mix(in oklab, #000 45%, transparent)",
    );
    expect(overlayColor({ tone: "brand", strength: 0.3 })).toContain("var(--sq-primary)");
  });
});
