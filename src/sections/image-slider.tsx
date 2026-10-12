"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import type { SliderItem } from "./items";
import { SqImage } from "./parts";

const CALM = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(CALM);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const prefersCalm = () => window.matchMedia(CALM).matches;

/**
 * Photos one after another (requirements SB-31, SB-42). Arrows, swipe and the keyboard work; it
 * moves by itself only when asked to, never faster than every 5 seconds, pauses on hover and
 * focus, has a pause button, and never moves for visitors who turn off motion.
 */
export function ImageSlider({ data, label }: { data: SliderItem; label: string }) {
  const slides = data.slides;
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const calm = useSyncExternalStore(subscribe, prefersCalm, () => true);
  const swipeStart = useRef<number | null>(null);

  const count = slides.length;
  const current = Math.min(index, count - 1);
  const canAutoplay = data.autoplay && count > 1 && !calm;
  const playing = canAutoplay && !stopped && !hovering && !focused;
  const seconds = Math.max(5, Number(data.interval) || 7);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % count), seconds * 1000);
    return () => clearInterval(timer);
  }, [playing, count, seconds]);

  const go = (next: number) => setIndex((next + count) % count);

  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="sq-slider relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(current + 1);
        if (event.key === "ArrowLeft") go(current - 1);
      }}
    >
      <div
        className="relative overflow-hidden rounded-sq"
        aria-live={playing ? "off" : "polite"}
        onPointerDown={(event) => (swipeStart.current = event.clientX)}
        onPointerUp={(event) => {
          if (swipeStart.current === null) return;
          const distance = event.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(distance) > 40) go(current + (distance < 0 ? 1 : -1));
        }}
      >
        {slides.map((slide, position) => (
          <figure
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${position + 1} of ${count}`}
            hidden={position !== current}
            className="m-0"
          >
            <SqImage image={slide.image} className="aspect-[16/9] w-full" />
            {slide.caption && (
              <figcaption className="mt-3 text-center text-sm text-sq-muted-fg">
                {slide.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" className="sq-slider-button" onClick={() => go(current - 1)}>
            <span aria-hidden>‹</span>
            <span className="sr-only">Previous photo</span>
          </button>
          <div className="flex gap-1.5">
            {slides.map((slide, position) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show photo ${position + 1}`}
                aria-current={position === current || undefined}
                onClick={() => go(position)}
                className={cn(
                  "size-2.5 rounded-full bg-sq-border",
                  position === current && "bg-sq-primary",
                )}
              />
            ))}
          </div>
          <button type="button" className="sq-slider-button" onClick={() => go(current + 1)}>
            <span aria-hidden>›</span>
            <span className="sr-only">Next photo</span>
          </button>
          {canAutoplay && (
            <button
              type="button"
              className="sq-slider-button px-3 text-sm"
              aria-pressed={stopped}
              onClick={() => setStopped(!stopped)}
            >
              {stopped ? "Play" : "Pause"}
              <span className="sr-only"> slideshow</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
