import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  DEFAULT_THEME,
  googleFontsHref,
  normalizeTheme,
  readableOn,
  THEME_PRESETS,
  themeVars,
  themeWarnings,
} from "./theme";

describe("theme", () => {
  it("fills defaults and repairs invalid values", () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
    const theme = normalizeTheme({ primary: "red", headingFont: "comic-sans", mode: "dark" });
    expect(theme.primary).toBe(DEFAULT_THEME.primary);
    expect(theme.headingFont).toBe("inter");
    expect(theme.mode).toBe("dark");
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("picks readable text for the brand color", () => {
    expect(readableOn("#4f46e5")).toBe("#ffffff");
    expect(readableOn("#fde047")).toBe("#0a0a0a");
  });

  it("maps a theme to CSS variables", () => {
    const vars = themeVars({
      ...DEFAULT_THEME,
      mode: "dark",
      radius: "round",
      headingFont: "playfair",
    });
    expect(vars["--sq-bg"]).toBe("#0b0b0f");
    expect(vars["--sq-radius"]).toBe("1.5rem");
    expect(vars["--sq-font-heading"]).toContain("Playfair Display");
  });

  it("builds one Google Fonts URL without duplicates", () => {
    const href = googleFontsHref({
      ...DEFAULT_THEME,
      headingFont: "dm-serif",
      bodyFont: "dm-sans",
    });
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:wght@400&family=DM+Sans:wght@400;500;700&display=swap",
    );
    expect(googleFontsHref(DEFAULT_THEME).match(/family=/g)).toHaveLength(1);
  });

  it("warns when the brand color blends into the background", () => {
    expect(themeWarnings({ ...DEFAULT_THEME, primary: "#f4f4f5" })).toHaveLength(1);
    expect(themeWarnings(DEFAULT_THEME)).toHaveLength(0);
  });

  it("ships presets that pass the contrast check", () => {
    for (const preset of THEME_PRESETS) {
      expect(themeWarnings({ ...preset.theme, preset: preset.id }), preset.name).toEqual([]);
    }
  });
});
