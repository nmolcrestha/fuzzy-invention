// More section types (Phase 4). Schemas only, no React.
import type { ImageValue, LinkValue } from "./fields";
import { f } from "./fields";
import { type RichTextDoc, richText } from "./rich-text";
import { defineSection } from "./types";

const COLUMN_OPTIONS = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const;

export const textImageSection = defineSection({
  type: "textImage",
  name: "Text and image",
  description: "A short story next to a picture. Good for “About us” and explaining a service.",
  category: "content",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "image-right", label: "Image on the right" },
    { id: "image-left", label: "Image on the left" },
  ],
  fields: {
    eyebrow: f.text({ label: "Small text above the heading", max: 40 }),
    heading: f.text({ label: "Heading", required: true, max: 100, default: "A little about us" }),
    body: f.richText({
      label: "Text",
      blocks: ["paragraph", "bulletList"],
      default: richText(
        "Tell your story in two or three short sentences: who you are, what you care about and why people choose you.",
      ),
    }),
    image: f.image({ label: "Image" }),
    button: f.link({ label: "Button", help: "Optional.", default: { label: "", href: "" } }),
  },
});
export type TextImageData = {
  eyebrow: string;
  heading: string;
  body: RichTextDoc;
  image: ImageValue;
  button: LinkValue;
};

export const statsSection = defineSection({
  type: "stats",
  name: "Numbers",
  description: "Big numbers that build trust: customers, years, ratings.",
  category: "social-proof",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "row", label: "In a row" },
    { id: "cards", label: "Cards" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100 }),
    items: f.list({
      label: "Numbers",
      itemLabel: "number",
      titleField: "label",
      min: 1,
      max: 6,
      fields: {
        value: f.text({ label: "Number", max: 12, default: "100+" }),
        label: f.text({ label: "What it means", max: 60, default: "Happy customers" }),
      },
      default: [
        { value: "10k+", label: "Happy customers" },
        { value: "4.9★", label: "Average rating" },
        { value: "15", label: "Years in business" },
      ],
    }),
  },
});
export type StatsData = { heading: string; items: { id: string; value: string; label: string }[] };

export const logosSection = defineSection({
  type: "logos",
  name: "Logo cloud",
  description: "Logos of clients, partners or press that mention you.",
  category: "social-proof",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "row", label: "One row" },
    { id: "grid", label: "Grid" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Trusted by teams at" }),
    items: f.list({
      label: "Logos",
      itemLabel: "logo",
      titleField: "name",
      min: 1,
      max: 12,
      fields: {
        name: f.text({
          label: "Name",
          max: 40,
          help: "Shown when there's no logo image.",
          default: "Company",
        }),
        image: f.image({ label: "Logo image" }),
      },
      default: [
        { name: "Northwind" },
        { name: "Acme" },
        { name: "Globex" },
        { name: "Initech" },
        { name: "Umbrella" },
      ],
    }),
  },
});
export type LogosData = {
  heading: string;
  items: { id: string; name: string; image: ImageValue }[];
};

export const stepsSection = defineSection({
  type: "steps",
  name: "How it works",
  description: "Explain your process in a few simple steps.",
  category: "content",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "columns", label: "Side by side" },
    { id: "list", label: "Top to bottom" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "How it works" }),
    intro: f.text({ label: "Intro", multiline: true, max: 300 }),
    items: f.list({
      label: "Steps",
      itemLabel: "step",
      titleField: "title",
      min: 1,
      max: 6,
      fields: {
        title: f.text({ label: "Title", max: 60, default: "A step" }),
        description: f.text({
          label: "Description",
          multiline: true,
          max: 240,
          default: "What happens in this step.",
        }),
      },
      default: [
        {
          title: "Tell us what you need",
          description: "A quick chat or form so we understand your goals.",
        },
        {
          title: "We get to work",
          description: "We plan, build and keep you updated along the way.",
        },
        { title: "Enjoy the result", description: "You get exactly what you asked for, on time." },
      ],
    }),
  },
});
export type StepsData = {
  heading: string;
  intro: string;
  items: { id: string; title: string; description: string }[];
};

export const testimonialsSection = defineSection({
  type: "testimonials",
  name: "Testimonials",
  description: "What happy customers say about you, in their own words.",
  category: "social-proof",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "grid", label: "Grid" },
    { id: "spotlight", label: "One big quote" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "What our customers say" }),
    items: f.list({
      label: "Testimonials",
      itemLabel: "testimonial",
      titleField: "name",
      min: 1,
      max: 9,
      fields: {
        quote: f.text({
          label: "Quote",
          multiline: true,
          max: 400,
          default: "A short, specific quote works best.",
        }),
        name: f.text({ label: "Name", max: 60, default: "Customer name" }),
        role: f.text({ label: "Role or company", max: 80 }),
        image: f.image({ label: "Photo" }),
      },
      default: [
        {
          quote: "They made the whole thing easy. We'd recommend them to anyone.",
          name: "Alex Morgan",
          role: "Small business owner",
        },
        {
          quote: "Fast, friendly and exactly what we needed. Five stars.",
          name: "Priya Sharma",
          role: "Marketing lead",
        },
        {
          quote: "The best decision we made this year. Our customers noticed right away.",
          name: "Daniel Okafor",
          role: "Founder",
        },
      ],
    }),
  },
  fieldsForVariant: () => null,
});
export type TestimonialsData = {
  heading: string;
  items: { id: string; quote: string; name: string; role: string; image: ImageValue }[];
};

export const teamSection = defineSection({
  type: "team",
  name: "Team",
  description: "Introduce the people behind your business.",
  category: "social-proof",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "grid", label: "Photo grid" },
    { id: "list", label: "List with bios" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Meet the team" }),
    intro: f.text({ label: "Intro", multiline: true, max: 300 }),
    members: f.list({
      label: "People",
      itemLabel: "person",
      titleField: "name",
      min: 1,
      max: 24,
      fields: {
        image: f.image({ label: "Photo" }),
        name: f.text({ label: "Name", max: 60, default: "Full name" }),
        role: f.text({ label: "Role", max: 60, default: "Role" }),
        bio: f.text({ label: "Short bio", multiline: true, max: 300 }),
      },
      default: [
        { name: "Sam Rivera", role: "Founder" },
        { name: "Mia Chen", role: "Operations" },
        { name: "Leo Novak", role: "Customer care" },
      ],
    }),
  },
});
export type TeamData = {
  heading: string;
  intro: string;
  members: { id: string; image: ImageValue; name: string; role: string; bio: string }[];
};

export const pricingSection = defineSection({
  type: "pricing",
  name: "Pricing",
  description: "Your plans and prices, with an optional monthly/yearly switch.",
  category: "conversion",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "cards", label: "Cards" },
    { id: "minimal", label: "Minimal" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Simple, honest pricing" }),
    intro: f.text({
      label: "Intro",
      multiline: true,
      max: 300,
      default: "Start free. Upgrade when you're ready.",
    }),
    currency: f.text({ label: "Currency symbol", max: 4, default: "$" }),
    showYearly: f.toggle({
      label: "Show a monthly / yearly switch",
      help: "Visitors can flip between your monthly and yearly prices.",
      default: true,
    }),
    yearlyNote: f.text({ label: "Yearly savings note", max: 30, default: "Save 20%" }),
    plans: f.list({
      label: "Plans",
      itemLabel: "plan",
      titleField: "name",
      min: 1,
      max: 4,
      fields: {
        name: f.text({ label: "Plan name", max: 40, default: "Plan" }),
        priceMonthly: f.text({
          label: "Monthly price",
          max: 12,
          help: "Just the number, e.g. 19.",
          default: "19",
        }),
        priceYearly: f.text({ label: "Yearly price (per month)", max: 12, default: "15" }),
        description: f.text({ label: "Who it's for", max: 120 }),
        features: f.text({
          label: "Features",
          multiline: true,
          max: 600,
          help: "One feature per line.",
        }),
        button: f.link({ label: "Button", default: { label: "Get started", href: "" } }),
        highlighted: f.toggle({
          label: "Highlight this plan",
          help: "Shows a “Most popular” label.",
        }),
      },
      default: [
        {
          name: "Starter",
          priceMonthly: "0",
          priceYearly: "0",
          description: "For trying things out.",
          features: "1 project\nBasic support\nCommunity access",
          button: { label: "Start free", href: "" },
        },
        {
          name: "Pro",
          priceMonthly: "29",
          priceYearly: "23",
          description: "For growing teams.",
          features: "Unlimited projects\nPriority support\nAdvanced reports",
          highlighted: true,
          button: { label: "Get Pro", href: "" },
        },
        {
          name: "Business",
          priceMonthly: "79",
          priceYearly: "63",
          description: "For larger companies.",
          features: "Everything in Pro\nTeam permissions\nDedicated manager",
          button: { label: "Contact sales", href: "" },
        },
      ],
    }),
  },
});
export type PricingData = {
  heading: string;
  intro: string;
  currency: string;
  showYearly: boolean;
  yearlyNote: string;
  plans: {
    id: string;
    name: string;
    priceMonthly: string;
    priceYearly: string;
    description: string;
    features: string;
    button: LinkValue;
    highlighted: boolean;
  }[];
};

export const contactSection = defineSection({
  type: "contact",
  name: "Contact & map",
  description: "Your email, phone and address, with an optional map.",
  category: "contact",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "split", label: "Details and map side by side" },
    { id: "stacked", label: "Details only" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Get in touch" }),
    intro: f.text({
      label: "Intro",
      multiline: true,
      max: 300,
      default: "We'd love to hear from you. Reach out any way you like.",
      help: "Email, phone and address come from your website settings.",
    }),
    showMap: f.toggle({ label: "Show a map of your address", default: true }),
  },
  fieldsForVariant: (variant) => (variant === "stacked" ? ["heading", "intro"] : null),
});
export type ContactData = { heading: string; intro: string; showMap: boolean };

export const hoursSection = defineSection({
  type: "hours",
  name: "Opening hours",
  description: "When you're open, so people know when to visit or call.",
  category: "contact",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "card", label: "Card" },
    { id: "list", label: "Simple list" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Opening hours" }),
    items: f.list({
      label: "Hours",
      itemLabel: "row",
      titleField: "days",
      min: 1,
      max: 10,
      fields: {
        days: f.text({ label: "Days", max: 40, default: "Monday" }),
        hours: f.text({
          label: "Hours",
          max: 40,
          help: "e.g. 12:00–22:00, or Closed",
          default: "9:00–17:00",
        }),
      },
      default: [
        { days: "Monday – Thursday", hours: "12:00 – 22:00" },
        { days: "Friday – Saturday", hours: "12:00 – 23:00" },
        { days: "Sunday", hours: "Closed" },
      ],
    }),
    note: f.text({
      label: "Note",
      max: 160,
      placeholder: "e.g. Kitchen closes 30 minutes earlier",
    }),
  },
});
export type HoursData = {
  heading: string;
  items: { id: string; days: string; hours: string }[];
  note: string;
};

export const menuSection = defineSection({
  type: "menu",
  name: "Food menu",
  description: "Dishes and drinks with prices, grouped into categories.",
  category: "restaurant",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "two-columns", label: "Two columns" },
    { id: "single", label: "One column" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Our menu" }),
    intro: f.text({ label: "Intro", multiline: true, max: 300 }),
    categories: f.list({
      label: "Categories",
      itemLabel: "category",
      titleField: "name",
      min: 1,
      max: 12,
      fields: {
        name: f.text({ label: "Category name", max: 40, default: "Category" }),
        items: f.list({
          label: "Dishes",
          itemLabel: "dish",
          titleField: "name",
          min: 1,
          max: 30,
          fields: {
            name: f.text({ label: "Name", max: 60, default: "Dish name" }),
            description: f.text({ label: "Description", multiline: true, max: 200 }),
            price: f.text({ label: "Price", max: 16, default: "12" }),
            tags: f.text({ label: "Tags", max: 40, help: "e.g. V, VG, GF, Spicy" }),
          },
          default: [{ name: "Dish name", description: "A short, tasty description.", price: "12" }],
        }),
      },
      default: [
        {
          name: "Starters",
          items: [
            {
              id: "s1",
              name: "Bruschetta",
              description: "Grilled bread, tomatoes, basil, olive oil",
              price: "8",
              tags: "V",
            },
            {
              id: "s2",
              name: "Burrata",
              description: "Creamy burrata, cherry tomatoes, pesto",
              price: "12",
              tags: "V, GF",
            },
          ],
        },
        {
          name: "Mains",
          items: [
            {
              id: "m1",
              name: "Tagliatelle al ragù",
              description: "Slow-cooked beef ragù, fresh egg pasta",
              price: "18",
            },
            {
              id: "m2",
              name: "Margherita",
              description: "San Marzano tomatoes, fior di latte, basil",
              price: "14",
              tags: "V",
            },
          ],
        },
      ],
    }),
    currency: f.text({ label: "Currency symbol", max: 4, default: "$" }),
    note: f.text({
      label: "Note",
      max: 200,
      placeholder: "e.g. Please tell us about any allergies.",
    }),
  },
});
export type MenuData = {
  heading: string;
  intro: string;
  currency: string;
  note: string;
  categories: {
    id: string;
    name: string;
    items: { id: string; name: string; description: string; price: string; tags: string }[];
  }[];
};

export const gallerySection = defineSection({
  type: "gallery",
  name: "Gallery",
  description: "A grid of photos: your place, your work or your products.",
  category: "media",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "grid", label: "Even grid" },
    { id: "masonry", label: "Natural sizes" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Gallery" }),
    columns: f.select({ label: "Columns", options: COLUMN_OPTIONS, default: "3" }),
    images: f.list({
      label: "Photos",
      itemLabel: "photo",
      titleField: "caption",
      min: 1,
      max: 24,
      fields: {
        image: f.image({ label: "Photo" }),
        caption: f.text({ label: "Caption", max: 120 }),
      },
      default: [{}, {}, {}, {}, {}, {}],
    }),
  },
});
export type GalleryData = {
  heading: string;
  columns: "2" | "3" | "4";
  images: { id: string; image: ImageValue; caption: string }[];
};

export const videoSection = defineSection({
  type: "video",
  name: "Video",
  description: "Show a YouTube or Vimeo video.",
  category: "media",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "contained", label: "Contained" },
    { id: "wide", label: "Wide" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100 }),
    url: f.text({
      label: "Video link",
      required: true,
      max: 300,
      placeholder: "https://www.youtube.com/watch?v=…",
      help: "Paste a YouTube or Vimeo link.",
    }),
    caption: f.text({ label: "Caption", max: 200 }),
  },
});
export type VideoData = { heading: string; url: string; caption: string };
