"use client";

import { RefreshCwIcon, VideoIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VideoValue } from "@/sections/fields";

import { MediaPicker } from "./media-picker";

/** A video field: preview, choose/replace/remove, and a description for screen readers. */
export function VideoPickerField({
  id,
  siteId,
  value,
  onChange,
  onAltChange,
  label,
  describedBy,
}: {
  id: string;
  siteId: string;
  value: VideoValue;
  onChange: (value: VideoValue) => void;
  onAltChange?: (alt: string) => void;
  label?: string;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = value.src ? "Replace video" : "Choose video";
  return (
    <div className="grid gap-2">
      {value.src ? (
        <video
          src={value.src}
          poster={value.poster || undefined}
          controls
          muted
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-lg border bg-black object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted"
        >
          <VideoIcon className="size-6" aria-hidden />
          No video yet
        </button>
      )}
      <div className="flex gap-2">
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          aria-label={label ? `${action}: ${label}` : undefined}
          aria-describedby={describedBy}
          onClick={() => setOpen(true)}
        >
          {value.src ? <RefreshCwIcon aria-hidden /> : <VideoIcon aria-hidden />}
          {action}
        </Button>
        {value.src && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ src: "", poster: "", alt: "" })}
          >
            <XIcon aria-hidden />
            Remove
          </Button>
        )}
      </div>
      {value.src && (
        <>
          <Label htmlFor={`${id}-alt`} className="text-xs">
            Describe the video (for screen readers)
          </Label>
          <Input
            id={`${id}-alt`}
            value={value.alt}
            maxLength={200}
            placeholder="e.g. A one-minute tour of our bakery"
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
        accept="video"
        onPick={(pick) => onChange({ src: pick.src, poster: pick.poster ?? "", alt: pick.alt })}
      />
    </div>
  );
}
