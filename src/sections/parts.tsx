// Building blocks shared by all section components.
import { cn } from "@/lib/utils";

import type { ImageValue, LinkValue } from "./fields";

export type SiteContext = {
  siteName: string;
  /** Menu items in order: pages, then any extra links. */
  nav: { label: string; href: string }[];
  contact: { email?: string; phone?: string; address?: string };
  social: { label: string; href: string }[];
  year: number;
  /** Uploaded logo; without one, the header shows the site name's first letter. */
  logo?: ImageValue;
  /** True on the published site (forms send messages); false in previews. */
  live?: boolean;
};

export function Social({ site, className }: { site: SiteContext; className?: string }) {
  if (site.social.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-2", className)} aria-label="Social media">
      {site.social.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sq-fg"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export type SectionProps<T> = {
  data: T;
  variant: string;
  site: SiteContext;
  /** The block's id, for anything that needs a unique name on the page (e.g. form inputs). */
  sectionId: string;
};

export const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export function SqLink({
  link,
  kind = "primary",
}: {
  link: LinkValue;
  kind?: "primary" | "secondary";
}) {
  if (!link.label.trim()) return null;
  return (
    <a
      href={link.href || "#"}
      className={cn("sq-btn", kind === "primary" ? "sq-btn-primary" : "sq-btn-secondary")}
    >
      {link.label}
    </a>
  );
}

export function SqImage({ image, className }: { image: ImageValue; className?: string }) {
  if (!image.src) {
    return (
      <div
        role="img"
        aria-label="Image placeholder"
        className={cn(
          "flex aspect-[4/3] items-center justify-center rounded-sq border border-sq-border bg-[linear-gradient(135deg,color-mix(in_oklab,var(--sq-primary)_14%,var(--sq-muted)),var(--sq-muted))] text-sm text-sq-muted-fg",
          className,
        )}
      >
        Your image here
      </div>
    );
  }
  // Plain <img>: user images can come from any host (Vercel Blob from Phase 5).
  return (
    <img src={image.src} alt={image.alt} className={cn("rounded-sq object-cover", className)} />
  );
}

export function SectionHeading({
  heading,
  intro,
  center = true,
}: {
  heading: string;
  intro?: string;
  center?: boolean;
}) {
  if (!heading && !intro) return null;
  return (
    <div className={cn("mb-10 max-w-2xl md:mb-14", center && "mx-auto text-center")}>
      {heading && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h2>}
      {intro && <p className="mt-4 text-lg text-sq-muted-fg">{intro}</p>}
    </div>
  );
}
