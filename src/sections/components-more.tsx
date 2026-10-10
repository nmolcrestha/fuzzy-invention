// Components for the Phase 4 section types. Plain React (no hooks) like the others.
import { cn } from "@/lib/utils";

import type {
  ContactData,
  GalleryData,
  HoursData,
  LogosData,
  MenuData,
  PricingData,
  StatsData,
  StepsData,
  TeamData,
  TestimonialsData,
  TextImageData,
  VideoData,
} from "./defs-more";
import type { ImageValue } from "./fields";
import { mapEmbedUrl, mapLinkUrl, videoEmbedUrl } from "./media";
import { container, SectionHeading, type SectionProps, SqImage, SqLink } from "./parts";
import { richTextIsEmpty } from "./rich-text";
import { RichTextView } from "./rich-text-view";

const GRID_COLUMNS: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

function Avatar({
  image,
  name,
  className,
}: {
  image: ImageValue;
  name: string;
  className?: string;
}) {
  if (image.src) {
    return (
      <img
        src={image.src}
        alt={image.alt || name}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full bg-sq-primary font-semibold text-sq-primary-fg",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

function TextImage({ data, variant }: SectionProps<TextImageData>) {
  return (
    <div className={cn(container, "grid items-center gap-10 md:grid-cols-2 md:gap-16")}>
      <div className={cn(variant === "image-left" && "md:order-2")}>
        {data.eyebrow && (
          <p className="mb-3 text-sm font-semibold tracking-wide text-sq-primary uppercase">
            {data.eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{data.heading}</h2>
        {!richTextIsEmpty(data.body) && (
          <RichTextView doc={data.body} className="mt-5 text-lg text-sq-muted-fg" />
        )}
        {data.button.label.trim() && (
          <div className="mt-8">
            <SqLink link={data.button} />
          </div>
        )}
      </div>
      <SqImage image={data.image} className="aspect-[4/3] w-full" />
    </div>
  );
}

function Stats({ data, variant }: SectionProps<StatsData>) {
  return (
    <div className={container}>
      <SectionHeading heading={data.heading} />
      <dl
        className={cn(
          "grid gap-6 text-center",
          data.items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {data.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              variant === "cards" && "rounded-sq border border-sq-border bg-sq-surface p-6",
            )}
          >
            <dt className="sr-only">{item.label}</dt>
            <dd className="text-4xl font-bold tracking-tight text-sq-primary md:text-5xl">
              {item.value}
            </dd>
            <dd className="mt-2 text-sq-muted-fg">{item.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Logos({ data, variant }: SectionProps<LogosData>) {
  return (
    <div className={container}>
      {data.heading && (
        <p className="mb-8 text-center text-sm font-semibold tracking-wide text-sq-muted-fg uppercase">
          {data.heading}
        </p>
      )}
      <ul
        className={cn(
          variant === "grid"
            ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            : "flex flex-wrap items-center justify-center gap-x-12 gap-y-6",
        )}
      >
        {data.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center justify-center",
              variant === "grid" && "h-24 rounded-sq border border-sq-border bg-sq-surface p-4",
            )}
          >
            {item.image.src ? (
              <img
                src={item.image.src}
                alt={item.image.alt || item.name}
                className="max-h-10 w-auto object-contain opacity-80"
              />
            ) : (
              <span className="text-xl font-bold tracking-tight text-sq-muted-fg">{item.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps({ data, variant }: SectionProps<StepsData>) {
  return (
    <div className={cn(container, variant === "list" && "max-w-3xl")}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      <ol
        className={cn(
          "grid gap-8",
          variant === "columns" && GRID_COLUMNS[String(Math.min(data.items.length, 4))],
        )}
      >
        {data.items.map((item, index) => (
          <li key={item.id} className={cn(variant === "list" ? "flex gap-5" : "")}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sq-primary font-bold text-sq-primary-fg">
              {index + 1}
            </span>
            <div className={cn(variant === "columns" && "mt-4")}>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-1 text-sq-muted-fg">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Testimonials({ data, variant }: SectionProps<TestimonialsData>) {
  if (variant === "spotlight") {
    const [first] = data.items;
    if (!first) return null;
    return (
      <figure className={cn(container, "max-w-3xl text-center")}>
        <blockquote className="text-2xl leading-snug font-medium text-balance md:text-3xl">
          “{first.quote}”
        </blockquote>
        <figcaption className="mt-8 flex items-center justify-center gap-3">
          <Avatar image={first.image} name={first.name} className="size-12" />
          <span className="text-left">
            <span className="block font-semibold">{first.name}</span>
            {first.role && <span className="block text-sm text-sq-muted-fg">{first.role}</span>}
          </span>
        </figcaption>
      </figure>
    );
  }
  return (
    <div className={container}>
      <SectionHeading heading={data.heading} />
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <li key={item.id}>
            <figure className="flex h-full flex-col justify-between gap-6 rounded-sq border border-sq-border bg-sq-surface p-6">
              <blockquote className="text-lg">“{item.quote}”</blockquote>
              <figcaption className="flex items-center gap-3">
                <Avatar image={item.image} name={item.name} className="size-10 text-sm" />
                <span>
                  <span className="block font-semibold">{item.name}</span>
                  {item.role && <span className="block text-sm text-sq-muted-fg">{item.role}</span>}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Team({ data, variant }: SectionProps<TeamData>) {
  if (variant === "list") {
    return (
      <div className={cn(container, "max-w-4xl")}>
        <SectionHeading heading={data.heading} intro={data.intro} />
        <ul className="grid gap-8">
          {data.members.map((member) => (
            <li key={member.id} className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar
                image={member.image}
                name={member.name}
                className="size-24 shrink-0 text-2xl"
              />
              <div>
                <h3 className="text-lg font-semibold">{member.name}</h3>
                <p className="text-sq-primary">{member.role}</p>
                {member.bio && <p className="mt-2 text-sq-muted-fg">{member.bio}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className={container}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {data.members.map((member) => (
          <li key={member.id} className="text-center">
            {member.image.src ? (
              <img
                src={member.image.src}
                alt={member.image.alt || member.name}
                className="aspect-square w-full rounded-sq object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex aspect-square w-full items-center justify-center rounded-sq bg-sq-muted text-3xl font-semibold text-sq-muted-fg"
              >
                {initials(member.name)}
              </span>
            )}
            <h3 className="mt-4 font-semibold">{member.name}</h3>
            <p className="text-sm text-sq-muted-fg">{member.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function price(currency: string, value: string) {
  const trimmed = value.trim();
  return /^\d+([.,]\d+)?$/.test(trimmed)
    ? { amount: `${currency}${trimmed}`, perMonth: true }
    : { amount: trimmed, perMonth: false };
}

function Pricing({ data, variant, sectionId }: SectionProps<PricingData>) {
  const name = `billing-${sectionId}`;
  return (
    // The monthly/yearly switch is plain radio buttons + CSS (see .sq-pricing in site.css):
    // it works on published sites without any JavaScript.
    <div className={cn(container, "sq-pricing")}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      {data.showYearly && (
        <fieldset className="sq-billing mx-auto -mt-4 mb-10 flex w-fit gap-1 rounded-full border border-sq-border p-1 md:-mt-6">
          <legend className="sr-only">Billing period</legend>
          <input
            type="radio"
            id={`${name}-monthly`}
            name={name}
            value="monthly"
            defaultChecked
            className="sr-only"
          />
          <label htmlFor={`${name}-monthly`}>Monthly</label>
          <input
            type="radio"
            id={`${name}-yearly`}
            name={name}
            value="yearly"
            className="sr-only"
          />
          <label htmlFor={`${name}-yearly`}>
            Yearly
            {data.yearlyNote && (
              <span className="ml-1.5 text-xs opacity-80">{data.yearlyNote}</span>
            )}
          </label>
        </fieldset>
      )}
      <ul
        className={cn(
          "grid gap-6",
          GRID_COLUMNS[String(Math.min(Math.max(data.plans.length, 2), 4))],
        )}
      >
        {data.plans.map((plan) => {
          const monthly = price(data.currency, plan.priceMonthly);
          const yearly = price(data.currency, plan.priceYearly || plan.priceMonthly);
          const features = plan.features
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          return (
            <li
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-sq border p-6",
                variant === "cards" ? "bg-sq-surface" : "border-transparent",
                plan.highlighted
                  ? "border-sq-primary shadow-lg ring-1 ring-sq-primary"
                  : "border-sq-border",
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-sq-primary px-3 py-0.5 text-xs font-semibold text-sq-primary-fg">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-sm text-sq-muted-fg">{plan.description}</p>
              )}
              <p className="mt-6 flex items-baseline gap-1">
                <span data-price="monthly" className="text-4xl font-bold tracking-tight">
                  {monthly.amount}
                </span>
                {data.showYearly && (
                  <span data-price="yearly" className="text-4xl font-bold tracking-tight">
                    {yearly.amount}
                  </span>
                )}
                {monthly.perMonth && <span className="text-sq-muted-fg">/month</span>}
              </p>
              {features.length > 0 && (
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden className="text-sq-primary">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              {plan.button.label.trim() && (
                <div className="mt-8 [&>a]:w-full">
                  <SqLink link={plan.button} kind={plan.highlighted ? "primary" : "secondary"} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Contact({ data, variant, site }: SectionProps<ContactData>) {
  const { email, phone, address } = site.contact;
  const details = (
    <div>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{data.heading}</h2>
      {data.intro && <p className="mt-4 text-lg text-sq-muted-fg">{data.intro}</p>}
      <dl className="mt-8 grid gap-5">
        {email && (
          <div>
            <dt className="text-sm font-semibold text-sq-muted-fg">Email</dt>
            <dd className="text-lg">
              <a href={`mailto:${email}`} className="hover:underline">
                {email}
              </a>
            </dd>
          </div>
        )}
        {phone && (
          <div>
            <dt className="text-sm font-semibold text-sq-muted-fg">Phone</dt>
            <dd className="text-lg">
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">
                {phone}
              </a>
            </dd>
          </div>
        )}
        {address && (
          <div>
            <dt className="text-sm font-semibold text-sq-muted-fg">Address</dt>
            <dd className="text-lg whitespace-pre-line">
              <a
                href={mapLinkUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {address}
              </a>
            </dd>
          </div>
        )}
        {!email && !phone && !address && (
          <p className="text-sq-muted-fg">
            Add your email, phone and address in your website settings.
          </p>
        )}
      </dl>
    </div>
  );

  if (variant === "stacked" || !data.showMap || !address) {
    return <div className={cn(container, "max-w-3xl")}>{details}</div>;
  }
  return (
    <div className={cn(container, "grid gap-10 md:grid-cols-2 md:gap-16")}>
      {details}
      <iframe
        title={`Map of ${address}`}
        src={mapEmbedUrl(address)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="aspect-[4/3] w-full rounded-sq border border-sq-border"
      />
    </div>
  );
}

function Hours({ data, variant }: SectionProps<HoursData>) {
  const list = (
    <dl className="divide-y divide-sq-border">
      {data.items.map((item) => (
        <div key={item.id} className="flex justify-between gap-6 py-3">
          <dt className="font-medium">{item.days}</dt>
          <dd className={cn("text-right", /closed/i.test(item.hours) && "text-sq-muted-fg")}>
            {item.hours}
          </dd>
        </div>
      ))}
    </dl>
  );
  return (
    <div className={cn(container, "max-w-xl")}>
      <div
        className={cn(
          variant === "card" && "rounded-sq border border-sq-border bg-sq-surface p-6 md:p-8",
        )}
      >
        <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{data.heading}</h2>
        {list}
        {data.note && <p className="mt-4 text-sm text-sq-muted-fg">{data.note}</p>}
      </div>
    </div>
  );
}

function Menu({ data, variant }: SectionProps<MenuData>) {
  return (
    <div className={cn(container, variant === "single" && "max-w-3xl")}>
      <SectionHeading heading={data.heading} intro={data.intro} />
      <div className={cn("gap-x-16", variant === "two-columns" && "md:columns-2")}>
        {data.categories.map((category) => (
          <section key={category.id} className="mb-12 break-inside-avoid">
            <h3 className="mb-4 border-b border-sq-border pb-2 text-xl font-bold tracking-tight">
              {category.name}
            </h3>
            <ul className="space-y-5">
              {category.items.map((item) => (
                <li key={item.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold">{item.name}</span>
                    {item.tags && (
                      <span className="text-xs font-medium text-sq-primary">{item.tags}</span>
                    )}
                    <span aria-hidden className="flex-1 border-b border-dotted border-sq-border" />
                    <span className="font-semibold tabular-nums">
                      {/^\d/.test(item.price.trim())
                        ? `${data.currency}${item.price.trim()}`
                        : item.price}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-sq-muted-fg">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {data.note && <p className="text-center text-sm text-sq-muted-fg">{data.note}</p>}
    </div>
  );
}

function Gallery({ data, variant }: SectionProps<GalleryData>) {
  const columns = {
    "2": "sm:columns-2",
    "3": "sm:columns-2 lg:columns-3",
    "4": "sm:columns-2 lg:columns-4",
  }[data.columns];
  const shapes = ["aspect-[4/3]", "aspect-[3/4]", "aspect-square"];
  return (
    <div className={container}>
      <SectionHeading heading={data.heading} />
      <ul
        className={cn(
          variant === "masonry"
            ? cn("gap-4 [&>li]:mb-4", columns)
            : cn("grid gap-4", GRID_COLUMNS[data.columns]),
        )}
      >
        {data.images.map((item, index) => (
          <li key={item.id} className="break-inside-avoid">
            <figure>
              <SqImage
                image={item.image}
                className={cn(
                  "w-full",
                  variant === "masonry"
                    ? item.image.src
                      ? "h-auto"
                      : shapes[index % 3]
                    : "aspect-[4/3]",
                )}
              />
              {item.caption && (
                <figcaption className="mt-2 text-sm text-sq-muted-fg">{item.caption}</figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Video({ data, variant }: SectionProps<VideoData>) {
  const embed = videoEmbedUrl(data.url);
  return (
    <div className={cn(container, variant === "contained" && "max-w-4xl")}>
      {data.heading && (
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight md:text-4xl">
          {data.heading}
        </h2>
      )}
      <figure>
        {embed ? (
          <iframe
            src={embed}
            title={data.heading || "Video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full rounded-sq border border-sq-border"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-sq border border-dashed border-sq-border bg-sq-muted p-6 text-center text-sq-muted-fg">
            Paste a YouTube or Vimeo link to show your video here.
          </div>
        )}
        {data.caption && (
          <figcaption className="mt-3 text-center text-sm text-sq-muted-fg">
            {data.caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

export const MORE_SECTION_COMPONENTS = {
  textImage: TextImage,
  stats: Stats,
  logos: Logos,
  steps: Steps,
  testimonials: Testimonials,
  team: Team,
  pricing: Pricing,
  contact: Contact,
  hours: Hours,
  menu: Menu,
  gallery: Gallery,
  video: Video,
};
