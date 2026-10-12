"use client";

import { useState } from "react";

import type { LogosItem } from "./items";

/** Fewer logos than this don't move: they fit in one row anyway. */
const MIN_MOVING = 5;

function Logo({ logo }: { logo: LogosItem["logos"][number] }) {
  return logo.image.src ? (
    <img
      src={logo.image.src}
      alt={logo.image.alt || logo.name}
      loading="lazy"
      className="h-10 w-auto max-w-36 object-contain opacity-80 grayscale"
    />
  ) : (
    <span className="text-lg font-semibold whitespace-nowrap text-sq-muted-fg">{logo.name}</span>
  );
}

/**
 * Client logos sliding slowly across (requirements SB-31, SB-42, SB-43). It pauses on hover and
 * keyboard focus, has a pause button, and becomes a still row for visitors who turn off motion.
 */
export function LogoMarquee({ logos }: { logos: LogosItem["logos"] }) {
  const [paused, setPaused] = useState(false);
  if (logos.length < MIN_MOVING) {
    return (
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
        {logos.map((logo) => (
          <li key={logo.id}>
            <Logo logo={logo} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="sq-marquee" data-paused={paused || undefined}>
      <div className="sq-marquee-viewport">
        <ul className="sq-marquee-track" aria-label="Logos">
          {logos.map((logo) => (
            <li key={logo.id}>
              <Logo logo={logo} />
            </li>
          ))}
          {/* A second copy makes the loop seamless; screen readers skip it. */}
          {logos.map((logo) => (
            <li key={`${logo.id}-copy`} aria-hidden className="sq-marquee-copy">
              <Logo logo={logo} />
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        className="sq-marquee-toggle"
        aria-pressed={paused}
        onClick={() => setPaused(!paused)}
      >
        {paused ? "Play" : "Pause"}
        <span className="sr-only"> logo animation</span>
      </button>
    </div>
  );
}
