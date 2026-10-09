// Site theme: a few friendly choices that map onto the --sq-* CSS variables used by sections.
import { z } from "zod";

export const FONTS = [
  {
    id: "inter",
    label: "Inter",
    family: "Inter",
    fallback: "sans-serif",
    weights: "400;500;600;700",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    family: "DM Sans",
    fallback: "sans-serif",
    weights: "400;500;700",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "Poppins",
    fallback: "sans-serif",
    weights: "400;500;600;700",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "Montserrat",
    fallback: "sans-serif",
    weights: "400;500;600;700",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: "Space Grotesk",
    fallback: "sans-serif",
    weights: "400;500;700",
  },
  {
    id: "outfit",
    label: "Outfit",
    family: "Outfit",
    fallback: "sans-serif",
    weights: "400;500;600;700",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: "Playfair Display",
    fallback: "serif",
    weights: "400;600;700",
  },
  { id: "lora", label: "Lora", family: "Lora", fallback: "serif", weights: "400;600;700" },
  {
    id: "fraunces",
    label: "Fraunces",
    family: "Fraunces",
    fallback: "serif",
    weights: "400;600;700",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: "Merriweather",
    fallback: "serif",
    weights: "400;700",
  },
  {
    id: "dm-serif",
    label: "DM Serif Display",
    family: "DM Serif Display",
    fallback: "serif",
    weights: "400",
  },
] as const;

export type FontId = (typeof FONTS)[number]["id"];
const FONT_IDS = FONTS.map((font) => font.id) as [FontId, ...FontId[]];

export const RADIUS_OPTIONS = [
  { value: "sharp", label: "Sharp" },
  { value: "soft", label: "Soft" },
  { value: "round", label: "Round" },
] as const;

export const BUTTON_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "outline", label: "Outline" },
  { value: "pill", label: "Pill" },
] as const;

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Use a color like #4f46e5.");

export const themeSchema = z.object({
  preset: z.string().max(40).catch("modern").default("modern"),
  primary: hexColor.catch("#4f46e5").default("#4f46e5"),
  mode: z.enum(["light", "dark"]).catch("light").default("light"),
  headingFont: z.enum(FONT_IDS).catch("inter").default("inter"),
  bodyFont: z.enum(FONT_IDS).catch("inter").default("inter"),
  radius: z.enum(["sharp", "soft", "round"]).catch("soft").default("soft"),
  buttons: z.enum(["solid", "outline", "pill"]).catch("solid").default("solid"),
});

export type SiteTheme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: SiteTheme = themeSchema.parse({});

export function normalizeTheme(value: unknown): SiteTheme {
  return themeSchema.parse(value ?? {});
}

export const THEME_PRESETS: {
  id: string;
  name: string;
  description: string;
  theme: Omit<SiteTheme, "preset">;
}[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean and confident. Great for SaaS.",
    theme: {
      primary: "#4f46e5",
      mode: "light",
      headingFont: "inter",
      bodyFont: "inter",
      radius: "soft",
      buttons: "solid",
    },
  },
  {
    id: "trattoria",
    name: "Trattoria",
    description: "Warm and classic, for restaurants and cafés.",
    theme: {
      primary: "#c2410c",
      mode: "light",
      headingFont: "playfair",
      bodyFont: "lora",
      radius: "soft",
      buttons: "solid",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calm and natural.",
    theme: {
      primary: "#15803d",
      mode: "light",
      headingFont: "fraunces",
      bodyFont: "dm-sans",
      radius: "round",
      buttons: "solid",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Fresh and friendly.",
    theme: {
      primary: "#0369a1",
      mode: "light",
      headingFont: "space-grotesk",
      bodyFont: "dm-sans",
      radius: "round",
      buttons: "pill",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark and techy.",
    theme: {
      primary: "#a78bfa",
      mode: "dark",
      headingFont: "outfit",
      bodyFont: "inter",
      radius: "soft",
      buttons: "solid",
    },
  },
  {
    id: "studio",
    name: "Studio",
    description: "Elegant, for agencies and creatives.",
    theme: {
      primary: "#be123c",
      mode: "light",
      headingFont: "dm-serif",
      bodyFont: "dm-sans",
      radius: "sharp",
      buttons: "outline",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Minimal black and white.",
    theme: {
      primary: "#18181b",
      mode: "light",
      headingFont: "montserrat",
      bodyFont: "inter",
      radius: "sharp",
      buttons: "solid",
    },
  },
  {
    id: "sunrise",
    name: "Sunrise",
    description: "Bright and cheerful.",
    theme: {
      primary: "#b45309",
      mode: "light",
      headingFont: "poppins",
      bodyFont: "poppins",
      radius: "round",
      buttons: "pill",
    },
  },
];

// ---------- Colors ----------

function channel(value: number) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two #rrggbb colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text color that reads best on the given background. */
export function readableOn(background: string): string {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#0a0a0a")
    ? "#ffffff"
    : "#0a0a0a";
}

const SURFACES = {
  light: {
    bg: "#ffffff",
    fg: "#18181b",
    muted: "#f4f4f5",
    mutedFg: "#52525b",
    surface: "#ffffff",
    border: "#e4e4e7",
  },
  dark: {
    bg: "#0b0b0f",
    fg: "#fafafa",
    muted: "#17171c",
    mutedFg: "#a1a1aa",
    surface: "#141418",
    border: "#27272a",
  },
};

const RADIUS = { sharp: "0.125rem", soft: "0.75rem", round: "1.5rem" };

function fontStack(id: FontId) {
  const font = FONTS.find((item) => item.id === id) ?? FONTS[0];
  return `"${font.family}", ui-${font.fallback === "serif" ? "serif" : "sans-serif"}, ${font.fallback}`;
}

/** CSS custom properties for a theme, to put on the .sq-site element. */
export function themeVars(theme: SiteTheme): Record<string, string> {
  const surface = SURFACES[theme.mode];
  return {
    "--sq-bg": surface.bg,
    "--sq-fg": surface.fg,
    "--sq-muted": surface.muted,
    "--sq-muted-fg": surface.mutedFg,
    "--sq-surface": surface.surface,
    "--sq-border": surface.border,
    "--sq-primary": theme.primary,
    "--sq-primary-fg": readableOn(theme.primary),
    "--sq-radius": RADIUS[theme.radius],
    "--sq-font-heading": fontStack(theme.headingFont),
    "--sq-font-body": fontStack(theme.bodyFont),
  };
}

/** One Google Fonts stylesheet for the theme's fonts. */
export function googleFontsHref(theme: SiteTheme): string {
  const ids = [...new Set([theme.headingFont, theme.bodyFont])];
  const families = ids
    .map((id) => FONTS.find((font) => font.id === id))
    .filter((font) => font !== undefined)
    .map((font) => `family=${font.family.replaceAll(" ", "+")}:wght@${font.weights}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/** Plain-language warnings about hard-to-read color choices (requirement THM-4). */
export function themeWarnings(theme: SiteTheme): string[] {
  const warnings: string[] = [];
  const background = SURFACES[theme.mode].bg;
  if (contrastRatio(theme.primary, background) < 3) {
    warnings.push(
      theme.buttons === "outline"
        ? "Your brand color is hard to see on this background, so outline buttons may be hard to read. Pick a stronger color or solid buttons."
        : "Your brand color is close to the background color, so buttons may blend in. Try a darker or brighter color.",
    );
  }
  return warnings;
}
