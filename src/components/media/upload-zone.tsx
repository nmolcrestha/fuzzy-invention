"use client";

import { AlertCircleIcon, CheckIcon, ImageUpIcon, XIcon } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ALLOWED_IMAGE_TYPES, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/media-rules";
import { cn } from "@/lib/utils";

import type { UploadItem } from "./use-uploads";

/** Drop area plus a "Choose files" button. Also accepts images pasted from the clipboard. */
export function UploadZone({
  onFiles,
  uploads,
  onDismiss,
  compact = false,
  multiple = true,
}: {
  onFiles: (files: File[]) => void;
  uploads: UploadItem[];
  onDismiss: (id: string) => void;
  compact?: boolean;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const files = [...event.dataTransfer.files];
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
        }}
        onPaste={(event) => {
          const files = [...event.clipboardData.files];
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-10",
          dragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <ImageUpIcon className="size-7 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">
          {dragging ? "Drop to upload" : "Drag images here, or"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          Choose {multiple ? "images" : "an image"}
        </Button>
        <p id={hintId} className="text-xs text-muted-foreground">
          JPG, PNG, WebP, GIF or SVG, up to {formatBytes(MAX_UPLOAD_BYTES)}.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="grid gap-2" aria-label="Uploads" aria-live="polite">
          {uploads.map((item) => (
            <li key={item.id} className="grid gap-1.5 rounded-lg border p-2.5 text-sm">
              <div className="flex items-center gap-2">
                {item.status === "error" ? (
                  <AlertCircleIcon className="size-4 shrink-0 text-destructive" aria-hidden />
                ) : item.status === "done" ? (
                  <CheckIcon className="size-4 shrink-0 text-emerald-600" aria-hidden />
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                {item.status === "uploading" && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {item.progress}%
                  </span>
                )}
                {item.status === "done" && (
                  <span className="text-xs text-muted-foreground">Uploaded</span>
                )}
                {item.status === "error" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDismiss(item.id)}
                  >
                    <XIcon aria-hidden />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                )}
              </div>
              {item.status === "error" ? (
                <p role="alert" className="text-xs text-destructive">
                  {item.error}
                </p>
              ) : (
                <div
                  role="progressbar"
                  aria-label={`Uploading ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.progress}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
