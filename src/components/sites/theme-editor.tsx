"use client";

import { AlertTriangleIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import type { ToPreview } from "@/components/editor/preview-protocol";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BUTTON_OPTIONS,
  FONTS,
  RADIUS_OPTIONS,
  readableOn,
  type SiteTheme,
  THEME_PRESETS,
  themeWarnings,
} from "@/sections/theme";
import { updateTheme } from "@/server/sites/design-actions";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div role="radiogroup" className="flex gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className="flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SiteTheme["headingFont"];
  onChange: (id: SiteTheme["headingFont"]) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as SiteTheme["headingFont"])}
        className="h-9 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <optgroup label="Modern (sans-serif)">
          {FONTS.filter((font) => font.fallback === "sans-serif").map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Classic (serif)">
          {FONTS.filter((font) => font.fallback === "serif").map((font) => (
            <option key={font.id} value={font.id}>
              {font.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

export function ThemeEditor({
  siteId,
  initial,
  previewPageId,
}: {
  siteId: string;
  initial: SiteTheme;
  previewPageId: string | null;
}) {
  const [theme, setTheme] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [hexDraft, setHexDraft] = useState(initial.primary);
  const iframe = useRef<HTMLIFrameElement>(null);
  const themeRef = useRef(theme);
  const colorId = useId();

  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);
  const warnings = themeWarnings(theme);

  // Live preview: push every change into the preview iframe.
  useEffect(() => {
    themeRef.current = theme;
    const message: ToPreview = { type: "sq:theme", theme };
    iframe.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [theme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source === iframe.current?.contentWindow && event.data?.type === "sq:ready") {
        const message: ToPreview = { type: "sq:theme", theme: themeRef.current };
        iframe.current?.contentWindow?.postMessage(message, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const update = (patch: Partial<SiteTheme>) =>
    setTheme((current) => ({ ...current, ...patch, preset: patch.preset ?? "custom" }));

  async function save() {
    setPending(true);
    const result = await updateTheme(siteId, theme);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSaved(theme);
    toast.success("Design saved. Publish the site design to show it to visitors.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Colors &amp; fonts</CardTitle>
          <CardDescription>
            Applies to every page. Visitors see it after you publish.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Start from a style</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={theme.preset === preset.id}
                  onClick={() => {
                    setTheme({ ...preset.theme, preset: preset.id });
                    setHexDraft(preset.theme.primary);
                  }}
                  className="flex items-center gap-2 rounded-lg border p-2 text-left text-sm hover:bg-muted aria-checked:border-primary aria-checked:bg-primary/5"
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: preset.theme.primary,
                      color: readableOn(preset.theme.primary),
                    }}
                    aria-hidden
                  >
                    {theme.preset === preset.id ? <CheckIcon className="size-4" /> : "Aa"}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{preset.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor={colorId}>Brand color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Pick brand color"
                value={theme.primary}
                onChange={(event) => {
                  update({ primary: event.target.value });
                  setHexDraft(event.target.value);
                }}
                className="h-9 w-12 cursor-pointer rounded-lg border bg-background p-1"
              />
              <Input
                id={colorId}
                value={hexDraft}
                maxLength={7}
                spellCheck={false}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  setHexDraft(value);
                  if (/^#[0-9a-f]{6}$/i.test(value)) update({ primary: value.toLowerCase() });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Used for buttons, icons and highlights.</p>
          </div>

          <Segmented
            label="Background"
            value={theme.mode}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(mode) => update({ mode })}
          />
          <FontSelect
            label="Heading font"
            value={theme.headingFont}
            onChange={(headingFont) => update({ headingFont })}
          />
          <FontSelect
            label="Text font"
            value={theme.bodyFont}
            onChange={(bodyFont) => update({ bodyFont })}
          />
          <Segmented
            label="Corners"
            value={theme.radius}
            options={RADIUS_OPTIONS}
            onChange={(radius) => update({ radius })}
          />
          <Segmented
            label="Buttons"
            value={theme.buttons}
            options={BUTTON_OPTIONS}
            onChange={(buttons) => update({ buttons })}
          />

          {warnings.length > 0 && (
            <div
              role="status"
              className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="grid gap-1">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setTheme(saved);
                  setHexDraft(saved.primary);
                }}
                disabled={pending}
              >
                Discard
              </Button>
            )}
            <Button onClick={save} disabled={!dirty || pending}>
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              Save design
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid content-start gap-2 lg:sticky lg:top-4 lg:self-start">
        <p className="text-sm text-muted-foreground">Preview of your homepage (draft)</p>
        {previewPageId ? (
          <iframe
            ref={iframe}
            src={`/preview/${previewPageId}?embed=1&mode=view`}
            title="Design preview"
            className={cn("h-[640px] w-full rounded-xl border bg-white lg:h-[calc(100svh-16rem)]")}
          />
        ) : (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            Add a page to see a preview.
          </p>
        )}
      </div>
    </div>
  );
}
