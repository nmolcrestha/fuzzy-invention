"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MediaItem } from "@/server/media/queries";

/** Checkerboard behind images so transparent PNGs and SVGs stay visible. */
const CHECKERBOARD =
  "bg-[conic-gradient(var(--color-muted)_25%,transparent_0_50%,var(--color-muted)_0_75%,transparent_0)] bg-[length:16px_16px]";

export function MediaThumb({
  item,
  className,
  contain = false,
}: {
  item: Pick<MediaItem, "url" | "alt">;
  className?: string;
  contain?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.alt}
      loading="lazy"
      className={cn("w-full", contain ? "object-contain" : "object-cover", CHECKERBOARD, className)}
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
              <MediaThumb item={item} className="aspect-square" />
              <span className="block truncate border-t px-2 py-1.5 text-xs font-medium">
                {item.fileName}
              </span>
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
