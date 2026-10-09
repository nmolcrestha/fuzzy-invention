// Section components: plain React (no hooks, no browser APIs) so the same code renders in the
// editor preview and on published sites.
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

import type {
  CtaData,
  FaqData,
  FeaturesData,
  FooterData,
  HeaderData,
  HeroData,
  TextData,
} from "./defs";
import type { ImageValue, LinkValue } from "./fields";
import { ICONS } from "./icon-map";
import { richTextIsEmpty } from "./rich-text";
import { RichTextView } from "./rich-text-view";

export type SiteContext = {
  siteName: string;
  /** Pages shown in the menu, in order. */
  nav: { label: string; href: string }[];
  contact: { email?: string; phone?: string; address?: string };
  year: number;
};

export type SectionProps<T> = { data: T; variant: string; site: SiteContext };

const container = "mx-auto w-full max-w-6xl px-5 sm:px-8";

function SqLink({ link, kind = "primary" }: { link: LinkValue; kind?: "primary" | "secondary" }) {
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

function SqImage({ image, className }: { image: ImageValue; className?: string }) {
  if (!image.src) {
    return (
      <div
        role="img"
        aria-label="Image placeholder"
        className={cn(
          "flex aspect-[4/3] items-center justify-center rounded-sq border border-sq-border bg-gradient-to-br from-sq-muted to-sq-surface text-sm text-sq-muted-fg",
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

function SectionHeading({
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

// ---------- Header & footer ----------

function Header({ data, variant, site }: SectionProps<HeaderData>) {
  const logo = (
    <a href="/" className="flex items-center gap-2 text-lg font-bold">
      <span className="flex size-8 items-center justify-center rounded-sq bg-sq-primary text-sm text-sq-primary-fg">
        {site.siteName.slice(0, 1).toUpperCase()}
      </span>
      {data.showSiteName && <span>{site.siteName}</span>}
    </a>
  );
  const links = site.nav.map((item) => (
    <a
      key={item.href}
      href={item.href}
      className="text-sm font-medium text-sq-muted-fg hover:text-sq-fg"
    >
      {item.label}
    </a>
  ));

  if (variant === "centered") {
    return (
      <div className={cn(container, "flex flex-col items-center gap-4 py-5")}>
        {logo}
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {links}
          <SqLink link={data.cta} />
        </nav>
      </div>
    );
  }
  return (
    <div className={cn(container, "flex flex-wrap items-center justify-between gap-4 py-4")}>
      {logo}
      <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {links}
        <SqLink link={data.cta} />
      </nav>
    </div>
  );
}

function Footer({ data, variant, site }: SectionProps<FooterData>) {
  const copyright = data.copyright.trim() || `© ${site.year} ${site.siteName}`;
  const contact = [site.contact.email, site.contact.phone, site.contact.address].filter(
    Boolean,
  ) as string[];

  if (variant === "simple") {
    return (
      <div
        className={cn(
          container,
          "flex flex-col items-center justify-between gap-4 py-8 text-sm text-sq-muted-fg md:flex-row",
        )}
      >
        <p>{copyright}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {site.nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-sq-fg">
              {item.label}
            </a>
          ))}
        </nav>
        {data.showContact && contact.length > 0 && <p>{contact.join(" · ")}</p>}
      </div>
    );
  }

  return (
    <div className={cn(container, "py-12")}>
      <div className="grid gap-10 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold">{site.siteName}</p>
          {data.tagline && <p className="mt-2 text-sm text-sq-muted-fg">{data.tagline}</p>}
        </div>
        {site.nav.length > 0 && (
          <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Pages</p>
            {site.nav.map((item) => (
              <a key={item.href} href={item.href} className="text-sq-muted-fg hover:text-sq-fg">
                {item.label}
              </a>
            ))}
          </nav>
        )}
        {data.showContact && contact.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-semibold">Contact</p>
            {site.contact.email && (
              <a
                href={`mailto:${site.contact.email}`}
                className="text-sq-muted-fg hover:text-sq-fg"
              >
                {site.contact.email}
              </a>
            )}
            {site.contact.phone && (
              <a
                href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
                className="text-sq-muted-fg hover:text-sq-fg"
              >
                {site.contact.phone}
              </a>
            )}
            {site.contact.address && (
              <p className="whitespace-pre-line text-sq-muted-fg">{site.contact.address}</p>
            )}
          </div>
        )}
      </div>
      <p className="mt-10 border-t border-sq-border pt-6 text-sm text-sq-muted-fg">{copyright}</p>
    </div>
  );
}

// ---------- Page sections ----------

function Hero({ data, variant }: SectionProps<HeroData>) {
  const text = (
    <>
      {data.eyebrow && (
        <p className="mb-4 inline-block rounded-full border border-sq-border px-3 py-1 text-sm font-medium text-sq-muted-fg">
          {data.eyebrow}
        </p>
      )}
      <h1
        className={cn(
          "text-4xl font-bold tracking-tight",
          variant === "split" ? "md:text-5xl" : "md:text-6xl",
        )}
      >
        {data.heading}
      </h1>
      {!richTextIsEmpty(data.subheading) && (
        <RichTextView doc={data.subheading} className="mt-6 text-lg text-sq-muted-fg md:text-xl" />
      )}
      <div className={cn("mt-8 flex flex-wrap gap-3", variant === "centered" && "justify-center")}>
        <SqLink link={data.primaryCta} />
        <SqLink link={data.secondaryCta} kind="secondary" />
      </div>
    </>
  );

  if (variant === "split") {
    return (
      <div className={cn(container, "grid items-center gap-10 md:grid-cols-2 md:gap-16")}>
        <div>{text}</div>
        <SqImage image={data.image} className="aspect-[4/3] w-full" />
      </div>
    );
  }
  return <div className={cn(container, "mx-auto max-w-3xl text-center")}>{text}</div>;
}

const GRID_COLUMNS = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

function Features({ data, variant }: SectionProps<FeaturesData>) {
  if (variant === "list") {
    return (
      <div className={cn(container, "grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16")}>
        <SectionHeading heading={data.heading} intro={data.intro} center={false} />
        <ul className="flex flex-col gap-8">
          {data.items.map((item) => {
            const Icon = ICONS[item.icon] ?? ICONS.sparkles;
            return (
              <li key={item.id} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-sq bg-sq-primary text-sq-primary-fg">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sq-muted-fg">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <div className={container}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      <ul className={cn("grid gap-6", GRID_COLUMNS[data.columns] ?? GRID_COLUMNS["3"])}>
        {data.items.map((item) => {
          const Icon = ICONS[item.icon] ?? ICONS.sparkles;
          return (
            <li key={item.id} className="rounded-sq border border-sq-border bg-sq-surface p-6">
              <span className="flex size-11 items-center justify-center rounded-sq bg-sq-primary text-sq-primary-fg">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sq-muted-fg">{item.description}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Cta({ data, variant }: SectionProps<CtaData>) {
  const content = (
    <>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{data.heading}</h2>
      {data.text && <p className="mx-auto mt-4 max-w-xl text-lg text-sq-muted-fg">{data.text}</p>}
      <div className="mt-8 flex justify-center">
        <SqLink link={data.button} />
      </div>
    </>
  );
  if (variant === "card") {
    return (
      <div className={container}>
        <div className="mx-auto max-w-4xl rounded-sq border border-sq-border bg-sq-surface px-6 py-12 text-center md:px-12 md:py-16">
          {content}
        </div>
      </div>
    );
  }
  return <div className={cn(container, "text-center")}>{content}</div>;
}

function Faq({ data, variant }: SectionProps<FaqData>) {
  if (variant === "columns") {
    return (
      <div className={container}>
        <SectionHeading heading={data.heading} intro={data.intro} />
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {data.items.map((item) => (
            <div key={item.id}>
              <dt className="text-lg font-semibold">{item.question}</dt>
              <dd className="mt-2 text-sq-muted-fg">
                <RichTextView doc={item.answer} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return (
    <div className={cn(container, "max-w-3xl")}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      <div className="divide-y divide-sq-border border-y border-sq-border">
        {data.items.map((item) => (
          // Native <details>: accessible and works without JavaScript.
          <details key={item.id} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="text-2xl leading-none text-sq-muted-fg transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-3 text-sq-muted-fg">
              <RichTextView doc={item.answer} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function Text({ data, variant }: SectionProps<TextData>) {
  return (
    <div className={cn(container, variant === "narrow" && "max-w-3xl")}>
      {data.heading && (
        <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">{data.heading}</h2>
      )}
      <RichTextView doc={data.body} className="text-lg leading-relaxed" />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SECTION_COMPONENTS: Record<string, ComponentType<SectionProps<any>>> = {
  header: Header,
  footer: Footer,
  hero: Hero,
  features: Features,
  cta: Cta,
  faq: Faq,
  text: Text,
};
