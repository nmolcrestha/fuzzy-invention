// The pieces of content a built section is made of (requirements SB-30, SB-31). Each item kind
// uses the same field DSL as section types, so the editor form, validation and defaults come
// for free. Schemas only, no React.
import type { ImageValue, LinkValue, ListItem, VideoValue } from "./fields";
import { dataSchema, defaults, f, type Fields } from "./fields";
import type { IconName } from "./icons";
import { type RichTextDoc, richText } from "./rich-text";

export type ItemDefinition = {
  kind: string;
  name: string;
  /** One sentence for the "Add item" menu. */
  description: string;
  fields: Fields;
};

const define = <const T extends ItemDefinition>(definition: T) => definition;

export const ITEM_DEFS = {
  heading: define({
    kind: "heading",
    name: "Heading",
    description: "A title. The most important one on the page becomes the main headline.",
    fields: {
      eyebrow: f.text({ label: "Small text above", max: 40 }),
      text: f.text({ label: "Heading", required: true, max: 120, default: "Your headline here" }),
      size: f.select({
        label: "Size",
        options: [
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ],
        default: "large",
      }),
    },
  }),
  text: define({
    kind: "text",
    name: "Text",
    description: "A paragraph or a short list.",
    fields: {
      body: f.richText({
        label: "Text",
        blocks: ["paragraph", "bulletList"],
        default: richText("Explain in a sentence or two what you offer and why it matters."),
      }),
    },
  }),
  buttons: define({
    kind: "buttons",
    name: "Buttons",
    description: "One or two buttons that take visitors somewhere.",
    fields: {
      primary: f.link({ label: "Main button", default: { label: "Get started", href: "" } }),
      secondary: f.link({
        label: "Second button",
        help: "Optional.",
        default: { label: "", href: "" },
      }),
    },
  }),
  image: define({
    kind: "image",
    name: "Image",
    description: "A photo or illustration.",
    fields: {
      image: f.image({ label: "Image", required: true }),
      ratio: f.select({
        label: "Shape",
        options: [
          { value: "auto", label: "Original" },
          { value: "wide", label: "Wide" },
          { value: "square", label: "Square" },
          { value: "tall", label: "Tall" },
        ],
        default: "auto",
      }),
    },
  }),
  video: define({
    kind: "video",
    name: "Video",
    description: "A video you upload, or one from YouTube or Vimeo.",
    fields: {
      video: f.video({ label: "Video", help: "Upload an MP4 or WebM video." }),
      embed: f.text({
        label: "Or paste a YouTube or Vimeo link",
        max: 300,
        placeholder: "https://www.youtube.com/watch?v=…",
      }),
    },
  }),
  logos: define({
    kind: "logos",
    name: "Logos",
    description: "Client or partner logos, in a row or a slowly moving carousel.",
    fields: {
      display: f.select({
        label: "Show as",
        options: [
          { value: "row", label: "Row" },
          { value: "carousel", label: "Moving carousel" },
        ],
        default: "carousel",
      }),
      logos: f.list({
        label: "Logos",
        itemLabel: "logo",
        titleField: "name",
        min: 1,
        max: 20,
        fields: {
          name: f.text({ label: "Company name", max: 60, default: "Company" }),
          image: f.image({ label: "Logo" }),
        },
        default: [
          { name: "Northwind" },
          { name: "Acme" },
          { name: "Globex" },
          { name: "Initech" },
          { name: "Umbrella" },
          { name: "Hooli" },
        ],
      }),
    },
  }),
  slider: define({
    kind: "slider",
    name: "Image slider",
    description: "Photos that slide one after another, with arrows and a pause button.",
    fields: {
      slides: f.list({
        label: "Slides",
        itemLabel: "slide",
        titleField: "caption",
        min: 1,
        max: 20,
        fields: {
          image: f.image({ label: "Image" }),
          caption: f.text({ label: "Caption", max: 120 }),
        },
        default: [
          { caption: "First photo" },
          { caption: "Second photo" },
          { caption: "Third photo" },
        ],
      }),
      autoplay: f.toggle({ label: "Move to the next slide by itself", default: true }),
      interval: f.select({
        label: "Time per slide",
        options: [
          { value: "5", label: "5 seconds" },
          { value: "7", label: "7 seconds" },
          { value: "10", label: "10 seconds" },
        ],
        default: "7",
      }),
    },
  }),
  icons: define({
    kind: "icons",
    name: "Icon list",
    description: "Short points with an icon each: features, services, benefits.",
    fields: {
      items: f.list({
        label: "Points",
        itemLabel: "point",
        titleField: "title",
        min: 1,
        max: 12,
        fields: {
          icon: f.icon({ label: "Icon", default: "sparkles" }),
          title: f.text({ label: "Title", max: 60, default: "A clear benefit" }),
          text: f.text({
            label: "Text",
            multiline: true,
            max: 200,
            default: "One sentence about it.",
          }),
        },
        default: [
          { icon: "zap", title: "Fast" },
          { icon: "shield", title: "Reliable" },
          { icon: "heart", title: "Friendly" },
        ],
      }),
    },
  }),
  stats: define({
    kind: "stats",
    name: "Numbers",
    description: "A few numbers people care about.",
    fields: {
      items: f.list({
        label: "Numbers",
        itemLabel: "number",
        titleField: "label",
        min: 1,
        max: 6,
        fields: {
          value: f.text({ label: "Number", max: 12, default: "100+" }),
          label: f.text({ label: "Label", max: 60, default: "Happy customers" }),
        },
        default: [
          { value: "10k+", label: "Customers" },
          { value: "4.9", label: "Average rating" },
          { value: "24/7", label: "Support" },
        ],
      }),
    },
  }),
  spacer: define({
    kind: "spacer",
    name: "Space",
    description: "Empty space between items.",
    fields: {
      size: f.select({
        label: "Height",
        options: [
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ],
        default: "medium",
      }),
    },
  }),
  divider: define({
    kind: "divider",
    name: "Line",
    description: "A thin line to separate content.",
    fields: {},
  }),
} satisfies Record<string, ItemDefinition>;

export type ItemKind = keyof typeof ITEM_DEFS;
export const ITEM_KINDS = Object.keys(ITEM_DEFS) as ItemKind[];

export function isItemKind(kind: string): kind is ItemKind {
  return kind in ITEM_DEFS;
}

/** Fresh content for a new item. */
export function newItemData(kind: ItemKind): Record<string, unknown> {
  return defaults(ITEM_DEFS[kind].fields);
}

const SCHEMAS = Object.fromEntries(
  ITEM_KINDS.map((kind) => [kind, dataSchema(ITEM_DEFS[kind].fields)]),
) as Record<ItemKind, ReturnType<typeof dataSchema>>;

/** Validates an item's content, filling in defaults. */
export function parseItemData(kind: ItemKind, data: unknown): Record<string, unknown> {
  const parsed = SCHEMAS[kind].safeParse(data ?? {});
  return parsed.success ? parsed.data : newItemData(kind);
}

// Typed views of item data, for the renderers.
export type HeadingItem = { eyebrow: string; text: string; size: "small" | "medium" | "large" };
export type TextItem = { body: RichTextDoc };
export type ButtonsItem = { primary: LinkValue; secondary: LinkValue };
export type ImageItem = { image: ImageValue; ratio: "auto" | "wide" | "square" | "tall" };
export type VideoItem = { video: VideoValue; embed: string };
export type LogosItem = {
  display: "row" | "carousel";
  logos: (ListItem & { name: string; image: ImageValue })[];
};
export type SliderItem = {
  slides: (ListItem & { image: ImageValue; caption: string })[];
  autoplay: boolean;
  interval: "5" | "7" | "10";
};
export type IconsItem = { items: (ListItem & { icon: IconName; title: string; text: string })[] };
export type StatsItem = { items: (ListItem & { value: string; label: string })[] };
export type SpacerItem = { size: "small" | "medium" | "large" };
