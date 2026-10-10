"use client";

import { ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import type { MediaItem } from "@/server/media/queries";

import { MediaDetailsDialog } from "./media-details-dialog";
import { MediaGrid } from "./media-grid";
import { UploadZone } from "./upload-zone";
import { type UploadMode, useUploads } from "./use-uploads";

/** The Media tab: upload, describe and delete the site's images. */
export function MediaLibrary({
  siteId,
  initialItems,
  uploadMode,
}: {
  siteId: string;
  initialItems: MediaItem[];
  uploadMode: UploadMode;
}) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState<{ item: MediaItem; justUploaded: boolean } | null>(null);

  const onUploaded = useCallback((item: MediaItem, batchSize: number) => {
    setItems((current) => [item, ...current.filter((other) => other.id !== item.id)]);
    // A single upload asks for its description right away (MED-3).
    if (batchSize === 1) setOpen({ item, justUploaded: true });
  }, []);
  const { uploads, uploadFiles, dismiss } = useUploads({ siteId, mode: uploadMode, onUploaded });

  const missingAlt = items.filter((item) => !item.alt).length;

  return (
    <section className="space-y-6 pt-2">
      <div>
        <h2 className="sr-only">Images</h2>
        <p className="text-sm text-muted-foreground">
          Images you upload here can be used in any section. Click an image to describe or delete
          it.
        </p>
      </div>

      <UploadZone onFiles={uploadFiles} uploads={uploads} onDismiss={dismiss} />

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Upload your logo, photos of your team, products or food. You can also upload right from any image in the editor."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {items.length === 1 ? "1 image" : `${items.length} images`}
            {missingAlt > 0 &&
              ` · ${missingAlt === 1 ? "1 needs" : `${missingAlt} need`} a description`}
          </p>
          <MediaGrid
            items={items}
            label="Your images"
            onSelect={(item) => setOpen({ item, justUploaded: false })}
          />
        </div>
      )}

      <MediaDetailsDialog
        item={open?.item ?? null}
        justUploaded={open?.justUploaded}
        onOpenChange={(next) => !next && setOpen(null)}
        onChanged={(item) =>
          setItems((current) => current.map((other) => (other.id === item.id ? item : other)))
        }
        onDeleted={(id) => setItems((current) => current.filter((other) => other.id !== id))}
      />
    </section>
  );
}
