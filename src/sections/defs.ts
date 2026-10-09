// All section types. Schemas only (no React) so the server can validate drafts cheaply.
import type { ImageValue, LinkValue } from "./fields";
import { f } from "./fields";
import type { IconName } from "./icons";
import { type RichTextDoc, richText } from "./rich-text";
import { defineSection } from "./types";

// ---------- Site header & footer ----------

export const headerSection = defineSection({
  type: "header",
  name: "Header",
  description: "Your logo or name and the main menu, shown at the top of every page.",
  category: "site",
  placement: "header",
  schemaVersion: 1,
  variants: [
    { id: "simple", label: "Logo left, menu right" },
    { id: "centered", label: "Centered" },
  ],
  fields: {
    showSiteName: f.toggle({ label: "Show website name next to the logo", default: true }),
    cta: f.link({
      label: "Button",
      help: "Optional. Leave the text empty to hide the button.",
      default: { label: "Contact us", href: "" },
    }),
  },
});
export type HeaderData = { showSiteName: boolean; cta: LinkValue };

export const footerSection = defineSection({
  type: "footer",
  name: "Footer",
  description: "Contact details, menu links and copyright, shown at the bottom of every page.",
  category: "site",
  placement: "footer",
  schemaVersion: 1,
  variants: [
    { id: "simple", label: "One line" },
    { id: "columns", label: "Columns" },
  ],
  fields: {
    tagline: f.text({
      label: "Short description",
      max: 160,
      placeholder: "What you do, in a sentence",
    }),
    showContact: f.toggle({
      label: "Show contact details",
      help: "Email, phone and address come from your website settings.",
      default: true,
    }),
    copyright: f.text({
      label: "Copyright line",
      max: 120,
      help: "Leave empty to show “© year, website name”.",
    }),
  },
  fieldsForVariant: (variant) => (variant === "simple" ? ["showContact", "copyright"] : null),
});
export type FooterData = { tagline: string; showContact: boolean; copyright: string };

// ---------- Page sections ----------

export const heroSection = defineSection({
  type: "hero",
  name: "Hero",
  description: "The first thing visitors see: a big headline, a short pitch and a button.",
  category: "intro",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "centered", label: "Centered" },
    { id: "split", label: "Text and image side by side" },
  ],
  fields: {
    eyebrow: f.text({
      label: "Small text above the headline",
      max: 40,
      placeholder: "e.g. New in town",
    }),
    heading: f.text({
      label: "Headline",
      required: true,
      max: 120,
      help: "Say what you offer in a few words.",
      default: "Say what you do in one clear sentence",
    }),
    subheading: f.richText({
      label: "Supporting text",
      marks: ["bold", "italic", "link"],
      default: richText("Add a sentence or two about who it's for and why it's worth their time."),
    }),
    primaryCta: f.link({ label: "Main button", default: { label: "Get started", href: "" } }),
    secondaryCta: f.link({
      label: "Second button",
      help: "Optional. Leave the text empty to hide it.",
      default: { label: "", href: "" },
    }),
    image: f.image({ label: "Image" }),
  },
  fieldsForVariant: (variant) =>
    variant === "centered"
      ? ["eyebrow", "heading", "subheading", "primaryCta", "secondaryCta"]
      : null,
});
export type HeroData = {
  eyebrow: string;
  heading: string;
  subheading: RichTextDoc;
  primaryCta: LinkValue;
  secondaryCta: LinkValue;
  image: ImageValue;
};

export const featuresSection = defineSection({
  type: "features",
  name: "Features",
  description: "Show what you offer as a set of short points with icons.",
  category: "content",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "grid", label: "Grid" },
    { id: "list", label: "List" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Why people choose us" }),
    intro: f.text({ label: "Intro", multiline: true, max: 300 }),
    columns: f.select({
      label: "Columns",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
      default: "3",
    }),
    items: f.list({
      label: "Features",
      itemLabel: "feature",
      titleField: "title",
      min: 1,
      max: 12,
      fields: {
        icon: f.icon({ label: "Icon", default: "sparkles" }),
        title: f.text({ label: "Title", max: 60, default: "A clear benefit" }),
        description: f.text({
          label: "Description",
          multiline: true,
          max: 240,
          default: "Explain it in a sentence your customers would use.",
        }),
      },
      default: [
        {
          icon: "zap",
          title: "Fast",
          description: "Explain what makes you quick or easy to work with.",
        },
        {
          icon: "shield",
          title: "Reliable",
          description: "Tell people why they can count on you.",
        },
        { icon: "heart", title: "Friendly", description: "Describe how you treat your customers." },
      ],
    }),
  },
  fieldsForVariant: (variant) => (variant === "list" ? ["heading", "intro", "items"] : null),
});
export type FeaturesData = {
  heading: string;
  intro: string;
  columns: "2" | "3" | "4";
  items: { id: string; icon: IconName; title: string; description: string }[];
};

export const ctaSection = defineSection({
  type: "cta",
  name: "Call to action",
  description: "A short, bold invitation with one button. Great near the end of a page.",
  category: "conversion",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "banner", label: "Full-width banner" },
    { id: "card", label: "Card" },
  ],
  fields: {
    heading: f.text({
      label: "Heading",
      required: true,
      max: 100,
      default: "Ready to get started?",
    }),
    text: f.text({
      label: "Text",
      multiline: true,
      max: 300,
      default: "Tell visitors what happens when they click the button.",
    }),
    button: f.link({ label: "Button", default: { label: "Get in touch", href: "" } }),
  },
});
export type CtaData = { heading: string; text: string; button: LinkValue };

export const faqSection = defineSection({
  type: "faq",
  name: "FAQ",
  description: "Answer the questions people ask before they buy or visit.",
  category: "conversion",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "accordion", label: "Expandable list" },
    { id: "columns", label: "Two columns, all open" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Frequently asked questions" }),
    intro: f.text({ label: "Intro", multiline: true, max: 300 }),
    items: f.list({
      label: "Questions",
      itemLabel: "question",
      titleField: "question",
      min: 1,
      max: 20,
      fields: {
        question: f.text({ label: "Question", max: 160, default: "A question people often ask?" }),
        answer: f.richText({
          label: "Answer",
          marks: ["bold", "italic", "link"],
          blocks: ["paragraph", "bulletList"],
          default: richText("A short, friendly answer."),
        }),
      },
      default: [
        {
          question: "How do I get started?",
          answer: richText("Explain the first step in a sentence or two."),
        },
        {
          question: "How much does it cost?",
          answer: richText("Give a price, a range or where to find it."),
        },
        {
          question: "How can I contact you?",
          answer: richText("Tell people the best way to reach you."),
        },
      ],
    }),
  },
});
export type FaqData = {
  heading: string;
  intro: string;
  items: { id: string; question: string; answer: RichTextDoc }[];
};

export const textSection = defineSection({
  type: "text",
  name: "Text",
  description: "A block of formatted text, for your story, details or anything else.",
  category: "content",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "narrow", label: "Narrow (easy to read)" },
    { id: "wide", label: "Wide" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Our story" }),
    body: f.richText({
      label: "Text",
      marks: ["bold", "italic", "link"],
      blocks: ["paragraph", "heading", "bulletList", "orderedList"],
      default: richText(
        "Use this space to tell visitors more. Keep paragraphs short so they're easy to read on a phone.",
      ),
    }),
  },
});
export type TextData = { heading: string; body: RichTextDoc };
