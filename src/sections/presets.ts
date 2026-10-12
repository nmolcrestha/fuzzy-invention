// "Build your own" starting points (requirements SB-1, SB-2): goals, and the starting designs for
// each goal. A design builds a layout (and sometimes a background), and names the items the
// guided fill-in asks about. Pure data, no React.
import type { SectionStyle } from "@/db/schema";

import { CENTER, DEFAULT_OVERLAY } from "./backdrop";
import { richText } from "./rich-text";
import {
  type CustomLayout,
  type LayoutColumn,
  type LayoutItem,
  newColumn,
  newItem,
  newRow,
} from "./layout";
import { newItemData } from "./items";

/** What the guided fill-in asks for, pointing at item ids in the built layout. */
export type GuideSlots = {
  headline?: string;
  text?: string;
  buttons?: string;
  /** An image, video, logos or slider item, or "backdrop" for the section's background. */
  media?: string;
  mediaKind?: "image" | "video" | "logos" | "slides";
};

export type BuiltPreset = { layout: CustomLayout; style: SectionStyle; slots: GuideSlots };

export type Preset = {
  id: string;
  name: string;
  description: string;
  build: () => BuiltPreset;
};

export type Goal = {
  id: string;
  label: string;
  description: string;
  /** Icon name from lucide (mapped in the editor). */
  icon: "sparkles" | "building" | "images" | "video" | "list" | "mail";
  /** Preset ids, or "section:<type>" to add an existing section type instead. */
  presets: string[];
};

const heading = (text: string, size: "small" | "medium" | "large" = "large", eyebrow = "") =>
  newItem("heading", { ...newItemData("heading"), text, size, eyebrow });
const text = (body: string) => newItem("text", { body: richText(body) });
const buttons = (primary: string, secondary = "") =>
  newItem("buttons", {
    primary: { label: primary, href: "" },
    secondary: { label: secondary, href: "" },
  });
const centered = (items: LayoutItem[], patch: Partial<LayoutColumn> = {}) =>
  newColumn(
    items.map((item) => ({ ...item, align: "center" as const })),
    { align: "center", ...patch },
  );

function heroText(eyebrow = "") {
  const h = heading("Say what you do in one clear sentence", "large", eyebrow);
  const t = text("Add a line or two about who it's for and why they'll love it.");
  const b = buttons("Get started", "Learn more");
  return { h, t, b };
}

export const PRESETS: Record<string, Preset> = {
  "image-hero": {
    id: "image-hero",
    name: "Image hero",
    description: "Headline and buttons next to a big photo.",
    build: () => {
      const { h, t, b } = heroText("New");
      const image = newItem("image", { ...newItemData("image"), ratio: "square" });
      return {
        layout: {
          preset: "image-hero",
          rows: [
            newRow("1/2+1/2", [newColumn([h, t, b], { valign: "center" }), newColumn([image])]),
          ],
        },
        style: { spacing: "spacious" },
        slots: { headline: h.id, text: t.id, buttons: b.id, media: image.id, mediaKind: "image" },
      };
    },
  },
  "photo-hero": {
    id: "photo-hero",
    name: "Photo background",
    description: "Centered headline on top of a full-width photo.",
    build: () => {
      const { h, t, b } = heroText();
      return {
        layout: { preset: "photo-hero", rows: [newRow("1", [centered([h, t, b])])] },
        style: {
          spacing: "spacious",
          backdrop: { kind: "image", src: "", focal: CENTER, overlay: DEFAULT_OVERLAY },
        },
        slots: { headline: h.id, text: t.id, buttons: b.id, media: "backdrop", mediaKind: "image" },
      };
    },
  },
  "video-hero": {
    id: "video-hero",
    name: "Video background",
    description: "Centered headline over a silent, looping video.",
    build: () => {
      const { h, t, b } = heroText();
      return {
        layout: { preset: "video-hero", rows: [newRow("1", [centered([h, t, b])])] },
        style: {
          spacing: "spacious",
          backdrop: {
            kind: "video",
            src: "",
            poster: "",
            overlay: { tone: "dark", strength: 0.5 },
          },
        },
        slots: { headline: h.id, text: t.id, buttons: b.id, media: "backdrop", mediaKind: "video" },
      };
    },
  },
  "logo-carousel": {
    id: "logo-carousel",
    name: "Logo carousel",
    description: "Your clients' logos, slowly moving across the page.",
    build: () => {
      const h = heading("Trusted by teams at", "small");
      const logos = newItem("logos", { ...newItemData("logos"), display: "carousel" });
      return {
        layout: { preset: "logo-carousel", rows: [newRow("1", [centered([h, logos])])] },
        style: { spacing: "compact" },
        slots: { headline: h.id, media: logos.id, mediaKind: "logos" },
      };
    },
  },
  "logo-row": {
    id: "logo-row",
    name: "Logo row",
    description: "Client logos side by side.",
    build: () => {
      const h = heading("Our clients", "small");
      const logos = newItem("logos", { ...newItemData("logos"), display: "row" });
      return {
        layout: { preset: "logo-row", rows: [newRow("1", [centered([h, logos])])] },
        style: { spacing: "compact" },
        slots: { headline: h.id, media: logos.id, mediaKind: "logos" },
      };
    },
  },
  "image-slider": {
    id: "image-slider",
    name: "Image slider",
    description: "Photos that slide one after another.",
    build: () => {
      const h = heading("A look inside", "medium");
      const slider = newItem("slider");
      return {
        layout: { preset: "image-slider", rows: [newRow("1", [centered([h, slider])])] },
        style: {},
        slots: { headline: h.id, media: slider.id, mediaKind: "slides" },
      };
    },
  },
  "photo-grid": {
    id: "photo-grid",
    name: "Photo grid",
    description: "A heading and three photos side by side.",
    build: () => {
      const h = heading("Our work", "medium");
      const photos = [0, 1, 2].map(() =>
        newItem("image", { ...newItemData("image"), ratio: "square" }),
      );
      return {
        layout: {
          preset: "photo-grid",
          rows: [
            newRow("1", [centered([h])]),
            newRow(
              "1/3x3",
              photos.map((photo) => newColumn([photo])),
            ),
          ],
        },
        style: {},
        slots: { headline: h.id, media: photos[0]!.id, mediaKind: "image" },
      };
    },
  },
  "text-media": {
    id: "text-media",
    name: "Text and photo",
    description: "A short story next to a picture.",
    build: () => {
      const h = heading("A little about us", "medium");
      const t = text("Tell your story in two or three short sentences.");
      const b = buttons("Read more");
      const image = newItem("image");
      return {
        layout: {
          preset: "text-media",
          rows: [
            newRow("1/2+1/2", [newColumn([h, t, b], { valign: "center" }), newColumn([image])]),
          ],
        },
        style: {},
        slots: { headline: h.id, text: t.id, buttons: b.id, media: image.id, mediaKind: "image" },
      };
    },
  },
  "video-feature": {
    id: "video-feature",
    name: "Video with text",
    description: "A video next to a short explanation.",
    build: () => {
      const h = heading("See it in action", "medium");
      const t = text("A one-minute tour of how it works.");
      const video = newItem("video");
      return {
        layout: {
          preset: "video-feature",
          rows: [newRow("1/3+2/3", [newColumn([h, t], { valign: "center" }), newColumn([video])])],
        },
        style: {},
        slots: { headline: h.id, text: t.id, media: video.id, mediaKind: "video" },
      };
    },
  },
  "icon-points": {
    id: "icon-points",
    name: "Icon list",
    description: "Three to six short points, each with an icon.",
    build: () => {
      const h = heading("Why people choose us", "medium");
      const icons = newItem("icons");
      return {
        layout: {
          preset: "icon-points",
          rows: [newRow("1", [centered([h])]), newRow("1", [newColumn([icons])])],
        },
        style: {},
        slots: { headline: h.id },
      };
    },
  },
  "service-cards": {
    id: "service-cards",
    name: "Service cards",
    description: "Three cards, each with a title, text and a button.",
    build: () => {
      const h = heading("What we do", "medium");
      const cards = ["Strategy", "Design", "Support"].map((title) =>
        newColumn(
          [
            heading(title, "small"),
            text("One or two sentences about this service."),
            newItem("buttons", {
              primary: { label: "", href: "" },
              secondary: { label: "Learn more", href: "" },
            }),
          ],
          { background: "card" },
        ),
      );
      return {
        layout: {
          preset: "service-cards",
          rows: [newRow("1", [centered([h])]), newRow("1/3x3", cards)],
        },
        style: { background: "muted" },
        slots: { headline: h.id },
      };
    },
  },
  numbers: {
    id: "numbers",
    name: "Numbers",
    description: "A few numbers that build trust.",
    build: () => {
      const h = heading("In numbers", "medium");
      const stats = newItem("stats");
      return {
        layout: { preset: "numbers", rows: [newRow("1", [centered([h, stats])])] },
        style: {},
        slots: { headline: h.id },
      };
    },
  },
};

export const GOALS: Goal[] = [
  {
    id: "introduce",
    label: "Introduce your business",
    description: "A big first impression: headline, short text and a button.",
    icon: "sparkles",
    presets: ["image-hero", "photo-hero", "video-hero"],
  },
  {
    id: "logos",
    label: "Show client logos",
    description: "Prove that others already trust you.",
    icon: "building",
    presets: ["logo-carousel", "logo-row"],
  },
  {
    id: "photos",
    label: "Show photos",
    description: "Your place, your work, your team or your food.",
    icon: "images",
    presets: ["image-slider", "photo-grid", "text-media"],
  },
  {
    id: "video",
    label: "Play a video",
    description: "A background video or a video people can watch.",
    icon: "video",
    presets: ["video-hero", "video-feature"],
  },
  {
    id: "services",
    label: "Show products or services",
    description: "What you offer, in short points or cards.",
    icon: "list",
    presets: ["service-cards", "icon-points", "numbers"],
  },
  {
    id: "messages",
    label: "Collect messages",
    description: "A contact form. Messages arrive in your inbox.",
    icon: "mail",
    presets: ["section:form"],
  },
];

/** Builds a preset with fresh ids. */
export function buildPreset(id: string): BuiltPreset | null {
  return PRESETS[id]?.build() ?? null;
}

/** The name shown for a section: built sections use their starting design's name. */
export function sectionDisplayName(
  block: { type: string; data: Record<string, unknown> },
  fallback: string,
) {
  if (block.type !== "custom") return fallback;
  const preset = (block.data.layout as { preset?: string } | undefined)?.preset ?? "";
  return PRESETS[preset]?.name ?? "Built section";
}
