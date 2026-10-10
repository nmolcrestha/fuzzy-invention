"use client";

import { ImageIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ImageValue } from "@/sections/fields";

import { MediaPicker } from "./media-picker";

/** An image field: preview, choose/replace/remove, and (optionally) its description. */
export function ImagePickerField({
  id,
  siteId,
  value,
  onChange,
  onAltChange,
  withAlt = true,
  pickerTitle,
  previewClassName,
  describedBy,
  label,
}: {
  id: string;
  siteId: string;
  value: ImageValue;
  onChange: (value: ImageValue) => void;
  /** Called while typing the description (so the editor can merge keystrokes into one undo step). */
  onAltChange?: (alt: string) => void;
  withAlt?: boolean;
  pickerTitle?: string;
  previewClassName?: string;
  describedBy?: string;
  /** The field's name, added to the button's accessible name ("Choose image: Logo"). */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const altId = `${id}-alt`;

  return (
    <div className="grid gap-2">
      {value.src ? (
        <div className="group relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.src}
            alt=""
            className={cn("aspect-video w-full bg-muted object-cover", previewClassName)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted",
            previewClassName,
          )}
        >
          <ImageIcon className="size-6" aria-hidden />
          No image yet
        </button>
      )}
      <div className="flex gap-2">
        <Button
          id={id}
          aria-label={
            label ? `${value.src ? "Replace image" : "Choose image"}: ${label}` : undefined
          }
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          aria-describedby={describedBy}
          onClick={() => setOpen(true)}
        >
          {value.src ? <RefreshCwIcon aria-hidden /> : <ImageIcon aria-hidden />}
          {value.src ? "Replace image" : "Choose image"}
        </Button>
        {value.src && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ src: "", alt: "" })}
          >
            <XIcon aria-hidden />
            Remove
          </Button>
        )}
      </div>
      {withAlt && value.src && (
        <>
          <Label htmlFor={altId} className="text-xs">
            Describe the image (for screen readers and Google)
          </Label>
          <Input
            id={altId}
            value={value.alt}
            maxLength={200}
            placeholder="e.g. Our team at the office"
            onChange={(event) =>
              onAltChange
                ? onAltChange(event.target.value)
                : onChange({ ...value, alt: event.target.value })
            }
          />
        </>
      )}
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        siteId={siteId}
        withAlt={withAlt}
        title={pickerTitle}
        onPick={(image) => onChange(withAlt ? image : { src: image.src, alt: "" })}
      />
    </div>
  );
}
