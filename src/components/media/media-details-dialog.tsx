"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, formatDuration } from "@/lib/media-rules";
import { checkMediaUsage, deleteMedia, updateMediaAlt } from "@/server/media/actions";
import type { MediaItem, MediaUsage } from "@/server/media/queries";

import { MediaThumb } from "./media-grid";

export function MediaDetailsDialog({
  item,
  onOpenChange,
  onChanged,
  onDeleted,
  justUploaded = false,
}: {
  item: MediaItem | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (item: MediaItem) => void;
  onDeleted: (id: string) => void;
  /** Ask for a description right away (requirement MED-3). */
  justUploaded?: boolean;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {item && (
          <Details
            key={item.id}
            item={item}
            onClose={() => onOpenChange(false)}
            onChanged={onChanged}
            onDeleted={onDeleted}
            justUploaded={justUploaded}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Details({
  item,
  onClose,
  onChanged,
  onDeleted,
  justUploaded,
}: {
  item: MediaItem;
  onClose: () => void;
  onChanged: (item: MediaItem) => void;
  onDeleted: (id: string) => void;
  justUploaded: boolean;
}) {
  const altId = useId();
  const noun = item.kind === "video" ? "video" : "image";
  const [alt, setAlt] = useState(item.alt);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState<MediaUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkMediaUsage(item.id).then((result) => {
      if (!cancelled && result.ok) setUsage(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  async function saveAlt() {
    setSaving(true);
    const result = await updateMediaAlt({ assetId: item.id, alt });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onChanged({ ...item, alt: alt.trim() });
    toast.success(`Description saved. It's filled in whenever you pick this ${noun}.`);
    if (justUploaded) onClose();
  }

  async function handleDelete() {
    const result = await deleteMedia(item.id);
    if (!result.ok) throw new Error(result.error);
    onDeleted(item.id);
    onClose();
    toast.success(
      result.data.removedFrom > 0
        ? `Deleted “${item.fileName}” and removed it from ${result.data.removedFrom === 1 ? "1 place" : `${result.data.removedFrom} places`}.`
        : `Deleted “${item.fileName}”.`,
    );
  }

  const consequences = !usage
    ? []
    : usage.places.length > 0
      ? [
          `It will be removed from: ${usage.places.join(", ")}. Those pages will show as changed.`,
          ...(usage.inPublishedVersions
            ? ["Your live website keeps showing it until you publish those pages again."]
            : []),
          "This can't be undone.",
        ]
      : ["It isn't used on your website, so nothing else changes.", "This can't be undone."];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate pr-6">
          {justUploaded ? `Describe your ${noun}` : item.fileName}
        </DialogTitle>
        <DialogDescription>
          {justUploaded
            ? "A short description helps people using screen readers, and helps Google understand your page."
            : [
                item.width && item.height ? `${item.width} × ${item.height}` : null,
                item.durationSeconds ? formatDuration(item.durationSeconds) : null,
                formatBytes(item.sizeBytes),
                `uploaded ${new Date(item.createdAt).toLocaleDateString()}`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </DialogDescription>
      </DialogHeader>

      <MediaThumb item={item} className="max-h-72 rounded-lg border" contain playable />

      <div className="grid gap-2">
        <Label htmlFor={altId}>{noun === "video" ? "Video" : "Image"} description</Label>
        <Textarea
          id={altId}
          value={alt}
          maxLength={200}
          rows={2}
          autoFocus={justUploaded}
          placeholder="e.g. Two chefs plating pasta in our kitchen"
          onChange={(event) => setAlt(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Describe what the {noun} shows. Used as the default whenever you add it to a section.
        </p>
      </div>

      {!justUploaded && (
        <div className="grid gap-1 text-sm">
          <p className="font-medium">Where it&apos;s used</p>
          {!usage ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
              Checking…
            </p>
          ) : usage.places.length > 0 ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {usage.places.map((place) => (
                <li key={place}>{place}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Not used on your website yet.</p>
          )}
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        {justUploaded ? (
          <Button variant="ghost" onClick={onClose}>
            Skip for now
          </Button>
        ) : (
          <ConfirmDialog
            trigger={
              <Button variant="ghost" className="text-destructive" disabled={!usage}>
                <Trash2Icon aria-hidden />
                Delete {noun}
              </Button>
            }
            title={`Delete “${item.fileName}”?`}
            description={`The ${noun} will be removed from your library.`}
            consequences={consequences}
            confirmLabel={usage?.places.length ? "Delete and remove from pages" : `Delete ${noun}`}
            tone="destructive"
            onConfirm={handleDelete}
          />
        )}
        <Button onClick={saveAlt} disabled={saving || alt.trim() === item.alt}>
          {saving && <Loader2Icon className="animate-spin" aria-hidden />}
          Save description
        </Button>
      </DialogFooter>
    </>
  );
}
