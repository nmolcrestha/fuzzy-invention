// Section backdrops (requirements SB-10 to SB-12): a gradient, image or video behind a section.
// `style.background` stays the color tone (it also decides the text colors); a backdrop is drawn
// on top of it, and its overlay decides which tone the text uses.
import { z } from "zod";

export type BackgroundTone = "default" | "muted" | "primary" | "dark";
/** "light" is only used over light overlays: dark text even on dark-mode sites. */
export type ContentTone = BackgroundTone | "light";
export type OverlayTone = "dark" | "light" | "brand";

export const GRADIENT_PRESETS = [
  { id: "brand", label: "Brand", tone: "primary" },
  { id: "soft", label: "Soft", tone: "muted" },
  { id: "night", label: "Night", tone: "dark" },
] as const satisfies readonly { id: string; label: string; tone: BackgroundTone }[];

export type GradientPreset = (typeof GRADIENT_PRESETS)[number]["id"];

export const OVERLAY_TONES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "brand", label: "Brand color" },
] as const satisfies readonly { id: OverlayTone; label: string }[];

export type Overlay = { tone: OverlayTone; strength: number };
export type Focal = { x: number; y: number };

export type Backdrop =
  | { kind: "gradient"; preset: GradientPreset }
  | { kind: "image"; src: string; focal: Focal; overlay: Overlay }
  | { kind: "video"; src: string; poster: string; overlay: Overlay };

export const DEFAULT_OVERLAY: Overlay = { tone: "dark", strength: 0.45 };
export const CENTER: Focal = { x: 0.5, y: 0.5 };

const webUrl = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).catch("");
const unit = z.number().min(0).max(1);
const overlaySchema = z
  .object({
    tone: z.enum(["dark", "light", "brand"]).catch("dark"),
    strength: unit.catch(DEFAULT_OVERLAY.strength),
  })
  .catch(DEFAULT_OVERLAY);
const focalSchema = z.object({ x: unit.catch(0.5), y: unit.catch(0.5) }).catch(CENTER);

export const backdropSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("gradient"),
    preset: z.enum(["brand", "soft", "night"]).catch("brand"),
  }),
  z.object({ kind: z.literal("image"), src: webUrl, focal: focalSchema, overlay: overlaySchema }),
  z.object({ kind: z.literal("video"), src: webUrl, poster: webUrl, overlay: overlaySchema }),
]);

/** Text tone over an overlay: dark overlays get light text, light ones dark text. */
const OVERLAY_TEXT_TONE: Record<OverlayTone, ContentTone> = {
  dark: "dark",
  light: "light",
  brand: "primary",
};

/**
 * The tone a section's content uses (drives text and button colors via `data-bg`).
 * Images and videos follow their overlay; gradients follow their preset.
 */
export function effectiveTone(style: {
  background?: BackgroundTone;
  backdrop?: Backdrop;
}): ContentTone {
  const backdrop = style.backdrop;
  if (backdrop?.kind === "gradient") {
    return GRADIENT_PRESETS.find((preset) => preset.id === backdrop.preset)?.tone ?? "primary";
  }
  if ((backdrop?.kind === "image" || backdrop?.kind === "video") && backdrop.src) {
    return OVERLAY_TEXT_TONE[backdrop.overlay.tone];
  }
  return style.background ?? "default";
}

/** Below this overlay strength, text over a photo or video is often hard to read. */
export const WEAK_OVERLAY = 0.3;

/** Non-blocking problems for the publish checks (SB-12, SB-52). */
export function backdropProblems(backdrop: Backdrop | undefined): string[] {
  if (!backdrop || backdrop.kind === "gradient") return [];
  const problems: string[] = [];
  if (!backdrop.src) {
    problems.push(
      backdrop.kind === "image"
        ? "the background image hasn't been chosen yet."
        : "the background video hasn't been chosen yet.",
    );
    return problems;
  }
  if (backdrop.kind === "video" && !backdrop.poster) {
    problems.push(
      "the background video has no still image, so phones and visitors who turn off motion see a plain background.",
    );
  }
  if (backdrop.overlay.strength < WEAK_OVERLAY) {
    problems.push("the overlay on the background is light, so the text may be hard to read.");
  }
  return problems;
}

/** CSS for the overlay layer. */
export function overlayColor({ tone, strength }: Overlay): string {
  const percent = Math.round(strength * 100);
  const color = tone === "dark" ? "#000" : tone === "light" ? "#fff" : "var(--sq-primary)";
  return `color-mix(in oklab, ${color} ${percent}%, transparent)`;
}

/**
 * Relative luminance (0–1) of an image's average color under an overlay, for the editor's
 * readability check. `average` is the image's mean luminance, `brand` the brand color's.
 * Browsers mix the overlay in a perceptual space, so blending happens on gamma-encoded values.
 */
export function luminanceUnderOverlay(average: number, overlay: Overlay, brand = 0.2): number {
  const encode = (value: number) => value ** (1 / 2.2);
  const target = overlay.tone === "dark" ? 0 : overlay.tone === "light" ? 1 : encode(brand);
  const mixed = encode(average) * (1 - overlay.strength) + target * overlay.strength;
  return mixed ** 2.2;
}

/** WCAG contrast between text and a background of the given luminance. */
export function contrastWithText(backgroundLuminance: number, textLuminance: number): number {
  const [hi, lo] = [backgroundLuminance, textLuminance].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
