"use client";

import { CheckIcon, PlayIcon } from "lucide-react";

import { formatDuration } from "@/lib/media-rules";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/server/media/queries";

/** Checkerboard behind images so transparent PNGs and SVGs stay visible. */
const CHECKERBOARD =
  "bg-[conic-gradient(var(--color-muted)_25%,transparent_0_50%,var(--color-muted)_0_75%,transparent_0)] bg-[length:16px_16px]";

/** A still of the item: the image itself, or a video's poster (or its first frame). */
export function MediaThumb({
  item,
  className,
  contain = false,
  playable = false,
}: {
  item: Pick<MediaItem, "url" | "alt" | "kind" | "posterUrl">;
  className?: string;
  contain?: boolean;
  /** Videos get controls (details dialog). */
  playable?: boolean;
}) {
  const fit = contain ? "object-contain" : "object-cover";
  if (item.kind === "video") {
    return (
      <video
        src={playable ? item.url : `${item.url}#t=0.5`}
        poster={item.posterUrl ?? undefined}
        controls={playable}
        muted
        playsInline
        preload={playable ? "metadata" : item.posterUrl ? "none" : "metadata"}
        aria-label={item.alt || undefined}
        className={cn("w-full bg-black", fit, className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.alt}
      loading="lazy"
      className={cn("w-full", fit, CHECKERBOARD, className)}
    />
  );
}

export function MediaGrid({
  items,
  selectedId,
  onSelect,
  label,
}: {
  items: MediaItem[];
  selectedId?: string | null;
  onSelect: (item: MediaItem) => void;
  label: string;
}) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={selectedId === undefined ? undefined : selected}
              className={cn(
                "group relative block w-full overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected && "ring-2 ring-primary",
              )}
            >
              <MediaThumb item={item} className="pointer-events-none aspect-square" />
              <span className="block truncate border-t px-2 py-1.5 text-xs font-medium">
                {item.kind === "video" && <span className="sr-only">Video: </span>}
                {item.fileName}
              </span>
              {item.kind === "video" && (
                <span className="absolute right-2 bottom-9 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  <PlayIcon className="size-3" aria-hidden />
                  {item.durationSeconds ? formatDuration(item.durationSeconds) : "Video"}
                </span>
              )}
              {!item.alt && (
                <span className="absolute top-2 left-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                  No description
                </span>
              )}
              {selected && (
                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-4" aria-hidden />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
