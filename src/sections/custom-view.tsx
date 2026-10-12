// Renders a built section (type "custom"): rows on a fixed grid, columns that stack on phones,
// and items. No hooks here (sliders and carousels are small client components), so it renders
// in the editor preview and on live sites.
import { cn } from "@/lib/utils";

import { ICONS } from "./icon-map";
import { ImageSlider } from "./image-slider";
import type {
  ButtonsItem,
  HeadingItem,
  IconsItem,
  ImageItem,
  LogosItem,
  SliderItem,
  SpacerItem,
  StatsItem,
  TextItem,
  VideoItem,
} from "./items";
import type { Align, CustomLayout, LayoutColumn, LayoutItem, SplitId } from "./layout";
import { LogoMarquee } from "./logo-marquee";
import { videoEmbedUrl } from "./media";
import { container, type SectionProps, SqImage, SqLink } from "./parts";
import { RichTextView } from "./rich-text-view";

const GRID: Record<SplitId, string> = {
  "1": "grid-cols-1",
  "1/2+1/2": "md:grid-cols-2",
  "2/3+1/3": "md:grid-cols-[2fr_1fr]",
  "1/3+2/3": "md:grid-cols-[1fr_2fr]",
  "1/3x3": "md:grid-cols-3",
  "1/4x4": "sm:grid-cols-2 lg:grid-cols-4",
};

const ALIGN_ITEMS: Record<Align, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};
const ALIGN_SELF: Record<Align, string> = {
  start: "self-start text-left",
  center: "self-center text-center",
  end: "self-end text-right",
};
const JUSTIFY: Record<Align, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const COLUMN_BACKGROUND = {
  none: { className: "", bg: undefined },
  soft: { className: "rounded-sq p-6 md:p-8", bg: "muted" },
  brand: { className: "rounded-sq p-6 md:p-8", bg: "primary" },
  card: {
    className: "rounded-sq border border-sq-border bg-sq-surface p-6 shadow-sm md:p-8",
    bg: undefined,
  },
} as const;

const HEADING_SIZE = {
  large: "text-4xl font-bold tracking-tight md:text-5xl",
  medium: "text-3xl font-bold tracking-tight md:text-4xl",
  small: "text-xl font-semibold",
};

const RATIO = {
  auto: "h-auto",
  wide: "aspect-[16/9]",
  square: "aspect-square",
  tall: "aspect-[3/4]",
};

const SPACE = { small: "h-4", medium: "h-10", large: "h-20" };

type ItemProps = {
  item: LayoutItem;
  align: Align;
  /** Heading level, worked out from where the heading sits on the page. */
  level: 1 | 2 | 3;
};

function Item({ item, align, level }: ItemProps) {
  switch (item.kind) {
    case "heading": {
      const data = item.data as HeadingItem;
      const Tag = `h${level}` as const;
      return (
        <div>
          {data.eyebrow && (
            <p className="mb-3 text-sm font-semibold tracking-wide text-sq-primary uppercase">
              {data.eyebrow}
            </p>
          )}
          <Tag className={HEADING_SIZE[data.size]}>{data.text}</Tag>
        </div>
      );
    }
    case "text":
      return (
        <RichTextView
          doc={(item.data as TextItem).body}
          className="sq-prose max-w-prose text-lg text-sq-muted-fg"
        />
      );
    case "buttons": {
      const data = item.data as ButtonsItem;
      if (!data.primary.label.trim() && !data.secondary.label.trim()) return null;
      return (
        <div className={cn("flex flex-wrap gap-3", JUSTIFY[align])}>
          <SqLink link={data.primary} />
          <SqLink link={data.secondary} kind="secondary" />
        </div>
      );
    }
    case "image": {
      const data = item.data as ImageItem;
      return <SqImage image={data.image} className={cn("w-full", RATIO[data.ratio])} />;
    }
    case "video": {
      const data = item.data as VideoItem;
      const embed = videoEmbedUrl(data.embed);
      if (embed) {
        return (
          <iframe
            src={embed}
            title={data.video.alt || "Video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-sq border border-sq-border"
          />
        );
      }
      if (data.video.src) {
        return (
          <video
            src={data.video.src}
            poster={data.video.poster || undefined}
            controls
            playsInline
            preload="none"
            aria-label={data.video.alt || undefined}
            className="aspect-video w-full rounded-sq bg-black object-cover"
          />
        );
      }
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-sq border border-sq-border bg-sq-muted text-sm text-sq-muted-fg">
          Your video here
        </div>
      );
    }
    case "logos": {
      const data = item.data as LogosItem;
      if (data.display === "carousel") return <LogoMarquee logos={data.logos} />;
      return (
        <ul className={cn("flex flex-wrap items-center gap-x-10 gap-y-6", JUSTIFY[align])}>
          {data.logos.map((logo) => (
            <li key={logo.id}>
              {logo.image.src ? (
                <img
                  src={logo.image.src}
                  alt={logo.image.alt || logo.name}
                  loading="lazy"
                  className="h-10 w-auto max-w-36 object-contain opacity-80 grayscale"
                />
              ) : (
                <span className="text-lg font-semibold text-sq-muted-fg">{logo.name}</span>
              )}
            </li>
          ))}
        </ul>
      );
    }
    case "slider":
      return <ImageSlider data={item.data as SliderItem} label="Photos" />;
    case "icons": {
      const data = item.data as IconsItem;
      return (
        <ul className="grid w-full gap-8 text-left sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((point) => {
            const Icon = ICONS[point.icon] ?? ICONS.sparkles;
            return (
              <li key={point.id} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sq bg-sq-primary text-sq-primary-fg">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{point.title}</span>
                  {point.text && <span className="mt-1 block text-sq-muted-fg">{point.text}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }
    case "stats": {
      const data = item.data as StatsItem;
      return (
        <dl className={cn("flex w-full flex-wrap gap-x-12 gap-y-6", JUSTIFY[align])}>
          {data.items.map((stat) => (
            <div key={stat.id}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-4xl font-bold tracking-tight">{stat.value}</dd>
              <dd className="mt-1 text-sq-muted-fg" aria-hidden>
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      );
    }
    case "spacer":
      return <div aria-hidden className={SPACE[(item.data as SpacerItem).size]} />;
    case "divider":
      return <hr className="w-full border-sq-border" />;
    default:
      return null;
  }
}

function Column({
  column,
  levelFor,
}: {
  column: LayoutColumn;
  levelFor: (item: LayoutItem) => 1 | 2 | 3;
}) {
  const background = COLUMN_BACKGROUND[column.background];
  return (
    <div
      data-bg={background.bg}
      className={cn(
        "flex min-w-0 flex-col gap-5",
        ALIGN_ITEMS[column.align],
        JUSTIFY[column.valign],
        background.className,
        column.mobile.hidden && "hidden md:flex",
        column.mobile.first && "max-md:order-first",
      )}
    >
      {column.items
        .filter((item) => !item.isHidden)
        .map((item) => {
          const align = item.align ?? column.align;
          return (
            <div
              key={item.id}
              data-sq-item={item.id}
              className={cn(
                "flex w-full flex-col",
                item.align && ALIGN_SELF[item.align],
                ALIGN_ITEMS[align],
              )}
            >
              <Item item={item} align={align} level={levelFor(item)} />
            </div>
          );
        })}
    </div>
  );
}

export function CustomSection({ data, isFirst }: SectionProps<{ layout: CustomLayout }>) {
  const layout = data.layout;
  // The section's first visible heading is its title: the page's main headline (h1) when the
  // section comes first, h2 otherwise. Later headings sit below it (h3).
  const firstHeading = layout.rows
    .flatMap((row) => row.columns.flatMap((column) => column.items))
    .find((item) => item.kind === "heading" && !item.isHidden);
  const levelFor = (item: LayoutItem) => (item.id === firstHeading?.id ? (isFirst ? 1 : 2) : 3);

  return (
    <div className={cn(container, "grid gap-10 md:gap-14")}>
      {layout.rows.map((row) => (
        <div key={row.id} className={cn("grid gap-8 md:gap-12", GRID[row.split])}>
          {row.columns.map((column) => (
            <Column key={column.id} column={column} levelFor={levelFor} />
          ))}
        </div>
      ))}
    </div>
  );
}
