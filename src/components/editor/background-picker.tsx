"use client";

import { AlertTriangleIcon, ImageIcon, RefreshCwIcon, VideoIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import type { SectionStyle } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
  type Backdrop,
  CENTER,
  contrastWithText,
  DEFAULT_OVERLAY,
  effectiveTone,
  type Focal,
  GRADIENT_PRESETS,
  luminanceUnderOverlay,
  type Overlay,
  OVERLAY_TONES,
  overlayColor,
  WEAK_OVERLAY,
} from "@/sections/backdrop";
import { luminance, readableOn } from "@/sections/theme";

const COLORS: {
  value: NonNullable<SectionStyle["background"]>;
  label: string;
  swatch: string;
}[] = [
  { value: "default", label: "Plain", swatch: "bg-white" },
  { value: "muted", label: "Soft", swatch: "bg-zinc-100" },
  { value: "primary", label: "Brand color", swatch: "bg-indigo-600" },
  { value: "dark", label: "Dark", swatch: "bg-zinc-950" },
];

const GRADIENT_SWATCHES: Record<string, string> = {
  brand: "bg-gradient-to-br from-indigo-600 to-indigo-950",
  soft: "bg-gradient-to-b from-zinc-100 to-white",
  night: "bg-gradient-to-br from-zinc-950 to-indigo-900",
};

type View = "color" | "gradient" | "image" | "video";

const VIEWS: { id: View; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
];

/** Section background (requirements SB-10 to SB-12, SB-41). */
export function BackgroundPicker({
  style,
  siteId,
  primary,
  chrome,
  onChange,
}: {
  style: SectionStyle;
  siteId: string;
  /** The theme's brand color, for the readability check. */
  primary: string;
  /** Header and footer only take plain colors. */
  chrome: boolean;
  /** `coalesce` merges slider moves into one undo step. */
  onChange: (patch: Partial<SectionStyle>, coalesce?: string) => void;
}) {
  const backdrop = chrome ? undefined : style.backdrop;
  const [view, setView] = useState<View>(backdrop?.kind ?? "color");
  const [picker, setPicker] = useState<"image" | "video" | null>(null);

  function choose(next: View) {
    setView(next);
    if (next === "color" && backdrop) onChange({ backdrop: undefined });
    if (next === "gradient" && backdrop?.kind !== "gradient") {
      onChange({ backdrop: { kind: "gradient", preset: "brand" } });
    }
    if ((next === "image" || next === "video") && backdrop?.kind !== next) setPicker(next);
  }

  const setOverlay = (overlay: Overlay, coalesce?: string) => {
    if (backdrop?.kind === "image" || backdrop?.kind === "video") {
      onChange({ backdrop: { ...backdrop, overlay } }, coalesce);
    }
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium">Background</legend>
      {!chrome && (
        <div
          role="tablist"
          aria-label="Background type"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={view === option.id}
              onClick={() => choose(option.id)}
              className="flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {view === "color" && (
        <div role="radiogroup" aria-label="Background color" className="grid grid-cols-4 gap-2">
          {COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={(style.background ?? "default") === option.value}
              onClick={() => onChange({ background: option.value, backdrop: undefined })}
              className="group grid justify-items-center gap-1 text-xs"
            >
              <span
                className={cn(
                  "size-9 rounded-full border-2 border-border ring-offset-2 group-aria-checked:ring-2 group-aria-checked:ring-primary",
                  option.swatch,
                )}
              />
              {option.label}
            </button>
          ))}
        </div>
      )}

      {view === "gradient" && (
        <div role="radiogroup" aria-label="Gradient" className="grid grid-cols-3 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={backdrop?.kind === "gradient" && backdrop.preset === preset.id}
              onClick={() => onChange({ backdrop: { kind: "gradient", preset: preset.id } })}
              className="group grid gap-1 text-xs"
            >
              <span
                className={cn(
                  "h-10 rounded-lg border-2 border-border ring-offset-2 group-aria-checked:ring-2 group-aria-checked:ring-primary",
                  GRADIENT_SWATCHES[preset.id],
                )}
              />
              {preset.label}
            </button>
          ))}
          <p className="col-span-3 text-xs text-muted-foreground">
            Made from your brand color, so it follows your design.
          </p>
        </div>
      )}

      {(view === "image" || view === "video") && (
        <MediaBackground
          kind={view}
          backdrop={backdrop?.kind === view ? backdrop : undefined}
          primary={primary}
          onChoose={() => setPicker(view)}
          onFocal={(focal) =>
            backdrop?.kind === "image" && onChange({ backdrop: { ...backdrop, focal } })
          }
          onOverlay={setOverlay}
        />
      )}

      <MediaPicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        siteId={siteId}
        accept={picker ?? "image"}
        withAlt={false}
        title={picker === "video" ? "Choose a background video" : "Choose a background image"}
        onPick={(pick) => {
          const overlay =
            backdrop?.kind === "image" || backdrop?.kind === "video"
              ? backdrop.overlay
              : DEFAULT_OVERLAY;
          const next: Backdrop =
            picker === "video"
              ? { kind: "video", src: pick.src, poster: pick.poster ?? "", overlay }
              : { kind: "image", src: pick.src, focal: CENTER, overlay };
          onChange({ backdrop: next });
        }}
      />
    </fieldset>
  );
}

function MediaBackground({
  kind,
  backdrop,
  primary,
  onChoose,
  onFocal,
  onOverlay,
}: {
  kind: "image" | "video";
  backdrop: Extract<Backdrop, { kind: "image" | "video" }> | undefined;
  primary: string;
  onChoose: () => void;
  onFocal: (focal: Focal) => void;
  onOverlay: (overlay: Overlay, coalesce?: string) => void;
}) {
  const strengthId = useId();
  const still = backdrop ? (backdrop.kind === "image" ? backdrop.src : backdrop.poster) : "";
  const readability = useReadability(still, backdrop?.overlay, primary);

  if (!backdrop?.src) {
    const Icon = kind === "image" ? ImageIcon : VideoIcon;
    return (
      <button
        type="button"
        onClick={onChoose}
        className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted"
      >
        <Icon className="size-6" aria-hidden />
        {kind === "image" ? "Choose a background image" : "Choose a background video"}
      </button>
    );
  }

  return (
    <div className="grid gap-3">
      {backdrop.kind === "image" ? (
        <FocalPicker
          src={backdrop.src}
          focal={backdrop.focal}
          overlay={backdrop.overlay}
          onChange={onFocal}
        />
      ) : (
        <div className="relative overflow-hidden rounded-lg border bg-black">
          <video
            src={backdrop.src}
            poster={backdrop.poster || undefined}
            muted
            loop
            playsInline
            autoPlay
            className="aspect-video w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: overlayColor(backdrop.overlay) }}
          />
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onChoose}>
        <RefreshCwIcon aria-hidden />
        {kind === "image" ? "Replace image" : "Replace video"}
      </Button>
      {backdrop.kind === "video" && !backdrop.poster && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          This video has no still image, so phones show a plain background. Upload it again to
          create one.
        </p>
      )}
      {backdrop.kind === "video" && (
        <p className="text-xs text-muted-foreground">
          Plays silently on a loop. Phones and visitors who turn off motion see the still image.
        </p>
      )}

      <div className="grid gap-2">
        <span className="text-sm font-medium">Overlay</span>
        <div
          role="radiogroup"
          aria-label="Overlay color"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {OVERLAY_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={backdrop.overlay.tone === tone.id}
              onClick={() => onOverlay({ ...backdrop.overlay, tone: tone.id })}
              className="flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {tone.label}
            </button>
          ))}
        </div>
        <label htmlFor={strengthId} className="flex justify-between text-xs text-muted-foreground">
          <span>Strength</span>
          <span className="tabular-nums">{Math.round(backdrop.overlay.strength * 100)}%</span>
        </label>
        <input
          id={strengthId}
          type="range"
          min={0}
          max={90}
          step={5}
          value={Math.round(backdrop.overlay.strength * 100)}
          onChange={(event) =>
            onOverlay(
              { ...backdrop.overlay, strength: Number(event.target.value) / 100 },
              "overlay-strength",
            )
          }
          className="accent-primary"
        />
        <p className="text-xs text-muted-foreground">
          The overlay keeps your text readable on top of the {kind}.
        </p>
      </div>

      {readability === "poor" && (
        <p
          role="alert"
          className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangleIcon className="size-4 shrink-0" aria-hidden />
          Text may be hard to read on this {kind}. Make the overlay stronger or pick another overlay
          color.
        </p>
      )}
    </div>
  );
}

/** Click or use the arrow keys to choose the part of the image that must stay visible. */
function FocalPicker({
  src,
  focal,
  overlay,
  onChange,
}: {
  src: string;
  focal: Focal;
  overlay: Overlay;
  onChange: (focal: Focal) => void;
}) {
  const clamp = (value: number) => Math.min(1, Math.max(0, Math.round(value * 100) / 100));
  return (
    <div className="grid gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Focal point: the part of the image that stays visible on every screen"
        aria-valuetext={`${Math.round(focal.x * 100)}% from the left, ${Math.round(focal.y * 100)}% from the top`}
        aria-valuenow={Math.round(focal.x * 100)}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          onChange({
            x: clamp((event.clientX - box.left) / box.width),
            y: clamp((event.clientY - box.top) / box.height),
          });
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.05;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          onChange({ x: clamp(focal.x + move[0]), y: clamp(focal.y + move[1]) });
        }}
        className="relative cursor-crosshair overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="aspect-video w-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{ background: overlayColor(overlay) }} />
        <span
          aria-hidden
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
          style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Click the most important part (e.g. a face). It stays visible when phones crop the image.
      </p>
    </div>
  );
}

/** Average relative luminance of an image (0–1), or null when it can't be read (other sites). */
async function averageLuminance(src: string): Promise<number | null> {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, 24, 24);
    const { data } = context.getImageData(0, 0, 24, 24);
    const linear = (value: number) => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total +=
        0.2126 * linear(data[i]!) + 0.7152 * linear(data[i + 1]!) + 0.0722 * linear(data[i + 2]!);
    }
    return total / (data.length / 4);
  } catch {
    return null;
  }
}

/** "poor" when the section's text would fail WCAG AA (large text, 3:1) over the image. */
function useReadability(src: string, overlay: Overlay | undefined, primary: string) {
  const [average, setAverage] = useState<{ src: string; value: number | null } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    void averageLuminance(src).then((value) => {
      if (!cancelled) setAverage({ src, value });
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!overlay || !src) return "unknown" as const;
  const measured = average?.src === src ? average.value : null;
  if (measured === null)
    return overlay.strength < WEAK_OVERLAY ? ("poor" as const) : ("unknown" as const);

  const tone = effectiveTone({ backdrop: { kind: "image", src, focal: CENTER, overlay } });
  const text = tone === "dark" ? "#fafafa" : tone === "primary" ? readableOn(primary) : "#18181b";
  const background = luminanceUnderOverlay(measured, overlay, luminance(primary));
  return contrastWithText(background, luminance(text)) < 3 ? ("poor" as const) : ("good" as const);
}
