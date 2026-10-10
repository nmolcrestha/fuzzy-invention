"use client";

import { ImageIcon, Link2Icon, Loader2Icon } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImageValue } from "@/sections/fields";
import { listMedia } from "@/server/media/actions";
import type { MediaItem } from "@/server/media/queries";

import { MediaGrid } from "./media-grid";
import { UploadZone } from "./upload-zone";
import { type UploadMode, useUploads } from "./use-uploads";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  /** Called with the chosen image. */
  onPick: (image: ImageValue) => void;
  title?: string;
  /** Ask for a description (off for icons and social images, where it isn't shown). */
  withAlt?: boolean;
};

/** Pick an image from the site's library, upload a new one, or paste a link (MED-2). */
export function MediaPicker(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {props.open && <Picker {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function Picker({
  onOpenChange,
  siteId,
  onPick,
  title = "Choose an image",
  withAlt = true,
}: Props) {
  const [tab, setTab] = useState<"library" | "link">("library");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [mode, setMode] = useState<UploadMode>("local");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const altId = useId();
  const linkId = useId();

  useEffect(() => {
    let cancelled = false;
    void listMedia(siteId).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(result.error);
      else {
        setItems(result.data.items);
        setMode(result.data.uploadMode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const select = (item: MediaItem) => {
    setSelected(item);
    setAlt(item.alt);
  };

  const onUploaded = useCallback((item: MediaItem) => {
    setItems((current) => [item, ...(current ?? []).filter((other) => other.id !== item.id)]);
    setSelected(item);
    setAlt(item.alt);
  }, []);
  const { uploads, uploadFiles, dismiss } = useUploads({ siteId, mode, onUploaded });

  const linkValid = /^https?:\/\/\S+$/i.test(link.trim());
  const canUse = tab === "library" ? Boolean(selected) : linkValid;

  function use() {
    if (tab === "library" && selected) onPick({ src: selected.url, alt: alt.trim() });
    else if (tab === "link" && linkValid) onPick({ src: link.trim(), alt: alt.trim() });
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Upload a new image or pick one you&apos;ve already uploaded.
        </DialogDescription>
      </DialogHeader>

      <div
        role="tablist"
        aria-label="Image source"
        className="flex w-fit gap-1 rounded-lg bg-muted p-1"
      >
        {(
          [
            ["library", "Your images", ImageIcon],
            ["link", "Paste a link", Link2Icon],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <div className="grid gap-4">
          <UploadZone compact onFiles={uploadFiles} uploads={uploads} onDismiss={dismiss} />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : !items ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Loading your images…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t uploaded any images yet. Your uploads will appear here.
            </p>
          ) : (
            <MediaGrid
              items={items}
              selectedId={selected?.id ?? null}
              onSelect={select}
              label="Your images"
            />
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor={linkId}>Image address</Label>
          <Input
            id={linkId}
            value={link}
            placeholder="https://…"
            onChange={(event) => setLink(event.target.value)}
            aria-invalid={(link.trim() !== "" && !linkValid) || undefined}
          />
          <p className="text-xs text-muted-foreground">
            {link.trim() !== "" && !linkValid
              ? "Paste an address that starts with https://"
              : "Use an image that's already online. Uploading keeps it safe if the other website removes it."}
          </p>
        </div>
      )}

      {withAlt && canUse && (
        <div className="grid gap-2">
          <Label htmlFor={altId}>Describe the image</Label>
          <Input
            id={altId}
            value={alt}
            maxLength={200}
            placeholder="e.g. Our team at the office"
            onChange={(event) => setAlt(event.target.value)}
          />
          <p
            className={
              alt.trim()
                ? "text-xs text-muted-foreground"
                : "text-xs text-amber-700 dark:text-amber-500"
            }
          >
            {alt.trim()
              ? "Read aloud by screen readers and used by Google."
              : "Add a short description so everyone knows what the image shows."}
          </p>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={use} disabled={!canUse}>
          Use this image
        </Button>
      </DialogFooter>
    </>
  );
}
