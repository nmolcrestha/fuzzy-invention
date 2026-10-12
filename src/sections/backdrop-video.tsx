"use client";

import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 768px)";
const CALM = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(WIDE), window.matchMedia(CALM)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

const shouldPlay = () => window.matchMedia(WIDE).matches && !window.matchMedia(CALM).matches;

/**
 * A muted, looping background video (requirement SB-41). It's only added on wider screens for
 * visitors who haven't asked for less motion, so phones never download it; they see the poster.
 */
export function BackgroundVideo({ src, poster }: { src: string; poster?: string }) {
  const play = useSyncExternalStore(subscribe, shouldPlay, () => false);
  if (!play) return null;
  return (
    <video
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      tabIndex={-1}
      aria-hidden
    />
  );
}
