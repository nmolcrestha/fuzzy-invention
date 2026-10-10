// Starter websites. Copy uses the business name and is written so it's obviously placeholder text
// that's easy to replace.
import { richText } from "@/sections/rich-text";

import type { TemplateDefinition } from "./types";

const saas: TemplateDefinition = {
  id: "saas-launch",
  name: "Launch",
  description: "A product landing page with features, pricing and FAQ.",
  kind: "saas",
  preset: "modern",
  build: ({ name, tagline }) => ({
    header: { variant: "simple", data: { cta: { label: "Start free", href: "/pricing" } } },
    footer: {
      variant: "columns",
      data: { tagline: tagline || `${name} helps teams get more done with less effort.` },
    },
    pages: [
      {
        title: "Home",
        path: "/",
        isHome: true,
        sections: [
          {
            type: "hero",
            variant: "split",
            data: {
              eyebrow: "New",
              heading: tagline || `Do your best work with ${name}`,
              subheading: richText(
                `${name} brings your work together in one simple place. Spend less time on busywork and more on what matters.`,
              ),
              primaryCta: { label: "Start free", href: "/pricing" },
              secondaryCta: { label: "See how it works", href: "#how-it-works" },
            },
          },
          { type: "logos", variant: "row" },
          {
            type: "features",
            variant: "grid",
            style: { background: "muted" },
            data: {
              heading: `Everything you need, nothing you don't`,
              intro: "Replace these with the three to six things your customers love most.",
              items: [
                {
                  icon: "zap",
                  title: "Fast setup",
                  description: "Get going in minutes. No training needed.",
                },
                {
                  icon: "users",
                  title: "Built for teams",
                  description: "Invite your team and work together in real time.",
                },
                {
                  icon: "chart",
                  title: "Clear reports",
                  description: "See what's working at a glance.",
                },
                {
                  icon: "lock",
                  title: "Secure by default",
                  description: "Your data is encrypted and backed up daily.",
                },
                {
                  icon: "globe",
                  title: "Works everywhere",
                  description: "On your laptop, tablet and phone.",
                },
                {
                  icon: "message",
                  title: "Real support",
                  description: "Talk to a human when you need help.",
                },
              ],
            },
          },
          { type: "steps", variant: "columns", style: { anchorId: "how-it-works" } },
          {
            type: "testimonials",
            variant: "grid",
            style: { background: "muted" },
          },
          { type: "pricing", variant: "cards" },
          { type: "faq", variant: "accordion" },
          {
            type: "cta",
            variant: "banner",
            style: { background: "primary" },
            data: {
              heading: `Ready to try ${name}?`,
              text: "Start free today. No credit card needed.",
              button: { label: "Start free", href: "/pricing" },
            },
          },
        ],
      },
      {
        title: "Pricing",
        path: "/pricing",
        sections: [
          { type: "pricing", variant: "cards" },
          { type: "faq", variant: "columns", style: { background: "muted" } },
          {
            type: "cta",
            variant: "card",
            data: {
              heading: "Questions before you start?",
              text: "We're happy to help you choose the right plan.",
              button: { label: "Contact us", href: "/contact" },
            },
          },
        ],
      },
      {
        title: "Contact",
        path: "/contact",
        sections: [{ type: "contact", variant: "stacked" }],
      },
    ],
  }),
};

const company: TemplateDefinition = {
  id: "company-studio",
  name: "Studio",
  description: "A company website with services, team and contact pages.",
  kind: "company",
  preset: "studio",
  build: ({ name, tagline }) => ({
    header: { variant: "simple", data: { cta: { label: "Get in touch", href: "/contact" } } },
    footer: {
      variant: "columns",
      data: { tagline: tagline || `${name} helps businesses grow with care and craft.` },
    },
    pages: [
      {
        title: "Home",
        path: "/",
        isHome: true,
        sections: [
          {
            type: "hero",
            variant: "centered",
            data: {
              eyebrow: name,
              heading: tagline || "We help businesses like yours grow",
              subheading: richText(
                "Tell visitors in one or two sentences what you do, who you do it for and what makes you different.",
              ),
              primaryCta: { label: "Our services", href: "/services" },
              secondaryCta: { label: "Get in touch", href: "/contact" },
            },
          },
          {
            type: "features",
            variant: "list",
            style: { background: "muted" },
            data: {
              heading: "What we do",
              intro: "A quick overview of your main services.",
              items: [
                {
                  icon: "rocket",
                  title: "Strategy",
                  description: "We help you decide where to go and how to get there.",
                },
                {
                  icon: "sparkles",
                  title: "Design",
                  description: "Clear, beautiful work your customers will remember.",
                },
                {
                  icon: "settings",
                  title: "Delivery",
                  description: "We build it, launch it and keep it running smoothly.",
                },
              ],
            },
          },
          {
            type: "textImage",
            variant: "image-right",
            data: {
              eyebrow: "About us",
              heading: `Why ${name}?`,
              body: richText(
                "Share your story here: when you started, what you believe in and how you work with clients.",
              ),
              button: { label: "Meet the team", href: "/about" },
            },
          },
          {
            type: "stats",
            variant: "cards",
            data: {
              items: [
                { value: "120+", label: "Projects delivered" },
                { value: "98%", label: "Happy clients" },
                { value: "10", label: "Years of experience" },
              ],
            },
          },
          { type: "testimonials", variant: "spotlight", style: { background: "muted" } },
          {
            type: "cta",
            variant: "banner",
            style: { background: "dark" },
            data: {
              heading: "Let's work together",
              text: "Tell us about your project and we'll get back to you within one business day.",
              button: { label: "Get in touch", href: "/contact" },
            },
          },
        ],
      },
      {
        title: "Services",
        path: "/services",
        sections: [
          {
            type: "features",
            variant: "grid",
            data: {
              heading: "Our services",
              intro: "Describe each service in a sentence or two.",
              items: [
                {
                  icon: "rocket",
                  title: "Strategy",
                  description: "Workshops and plans that set a clear direction.",
                },
                {
                  icon: "sparkles",
                  title: "Brand & design",
                  description: "Logos, websites and materials that stand out.",
                },
                {
                  icon: "chart",
                  title: "Marketing",
                  description: "Campaigns that bring in the right customers.",
                },
                {
                  icon: "settings",
                  title: "Operations",
                  description: "Processes and tools that save you time.",
                },
                {
                  icon: "users",
                  title: "Training",
                  description: "Help your team learn new skills quickly.",
                },
                {
                  icon: "message",
                  title: "Support",
                  description: "Ongoing help whenever you need it.",
                },
              ],
            },
          },
          { type: "steps", variant: "columns", style: { background: "muted" } },
          { type: "faq", variant: "accordion" },
        ],
      },
      {
        title: "About",
        path: "/about",
        sections: [
          {
            type: "textImage",
            variant: "image-left",
            data: {
              eyebrow: "Our story",
              heading: `The people behind ${name}`,
              body: richText(
                "Write a few sentences about how you started and what drives you.",
                "Keep it personal. Visitors want to know who they'll be working with.",
              ),
            },
          },
          { type: "team", variant: "grid", style: { background: "muted" } },
          { type: "logos", variant: "grid", data: { heading: "Some of our clients" } },
        ],
      },
      {
        title: "Contact",
        path: "/contact",
        sections: [{ type: "contact", variant: "split" }],
      },
    ],
  }),
};

const restaurant: TemplateDefinition = {
  id: "restaurant-trattoria",
  name: "Trattoria",
  description: "A restaurant website with menu, gallery, opening hours and map.",
  kind: "restaurant",
  preset: "trattoria",
  build: ({ name, tagline }) => ({
    header: { variant: "simple", data: { cta: { label: "Book a table", href: "/visit" } } },
    footer: {
      variant: "columns",
      data: { tagline: tagline || `${name}: good food, made with love.` },
    },
    pages: [
      {
        title: "Home",
        path: "/",
        isHome: true,
        sections: [
          {
            type: "hero",
            variant: "split",
            data: {
              eyebrow: "Welcome",
              heading: tagline || `Fresh, seasonal food at ${name}`,
              subheading: richText(
                "Describe your food and atmosphere in a sentence or two. What should people expect when they visit?",
              ),
              primaryCta: { label: "See the menu", href: "/menu" },
              secondaryCta: { label: "Book a table", href: "/visit" },
            },
          },
          {
            type: "textImage",
            variant: "image-left",
            style: { background: "muted" },
            data: {
              eyebrow: "Our story",
              heading: "Cooked from the heart",
              body: richText(
                "Share how it all started, where your recipes come from and what makes your kitchen special.",
              ),
              button: { label: "See the menu", href: "/menu" },
            },
          },
          {
            type: "gallery",
            variant: "grid",
            data: { heading: "A taste of what's waiting", columns: "3", images: [{}, {}, {}] },
          },
          {
            type: "testimonials",
            variant: "grid",
            style: { background: "muted" },
            data: {
              heading: "What our guests say",
              items: [
                {
                  quote: "The best pasta we've had outside Italy. We'll be back!",
                  name: "Giulia R.",
                  role: "Google review",
                },
                {
                  quote: "Warm welcome, wonderful food and a lovely atmosphere.",
                  name: "Tom B.",
                  role: "Tripadvisor",
                },
                {
                  quote: "Our new favourite spot for family dinners.",
                  name: "Aisha K.",
                  role: "Regular guest",
                },
              ],
            },
          },
          { type: "hours", variant: "card" },
          {
            type: "cta",
            variant: "banner",
            style: { background: "primary" },
            data: {
              heading: "Hungry? Book your table",
              text: "Call us or drop by. We'd love to have you.",
              button: { label: "Book a table", href: "/visit" },
            },
          },
        ],
      },
      {
        title: "Menu",
        path: "/menu",
        sections: [
          {
            type: "menu",
            variant: "two-columns",
            data: {
              intro: "Replace these dishes with your own. Prices update instantly.",
              note: "Please tell us about any allergies. V = vegetarian, VG = vegan, GF = gluten free.",
              categories: [
                {
                  name: "Starters",
                  items: [
                    {
                      name: "Bruschetta",
                      description: "Grilled bread, tomatoes, basil, olive oil",
                      price: "8",
                      tags: "V",
                    },
                    {
                      name: "Burrata",
                      description: "Creamy burrata, cherry tomatoes, pesto",
                      price: "12",
                      tags: "V, GF",
                    },
                    { name: "Calamari", description: "Crispy squid, lemon, aioli", price: "11" },
                  ],
                },
                {
                  name: "Pasta",
                  items: [
                    {
                      name: "Tagliatelle al ragù",
                      description: "Slow-cooked beef ragù, fresh egg pasta",
                      price: "18",
                    },
                    {
                      name: "Cacio e pepe",
                      description: "Pecorino, black pepper, spaghetti",
                      price: "15",
                      tags: "V",
                    },
                  ],
                },
                {
                  name: "Pizza",
                  items: [
                    {
                      name: "Margherita",
                      description: "San Marzano tomatoes, fior di latte, basil",
                      price: "14",
                      tags: "V",
                    },
                    {
                      name: "Diavola",
                      description: "Spicy salami, tomato, mozzarella",
                      price: "16",
                      tags: "Spicy",
                    },
                  ],
                },
                {
                  name: "Desserts",
                  items: [
                    {
                      name: "Tiramisù",
                      description: "Mascarpone, espresso, cocoa",
                      price: "8",
                      tags: "V",
                    },
                    {
                      name: "Panna cotta",
                      description: "Vanilla cream, berry compote",
                      price: "7",
                      tags: "V, GF",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: "Gallery",
        path: "/gallery",
        sections: [
          { type: "gallery", variant: "masonry", data: { heading: "Gallery", columns: "3" } },
        ],
      },
      {
        title: "Visit us",
        path: "/visit",
        sections: [
          {
            type: "contact",
            variant: "split",
            data: {
              heading: "Visit us",
              intro: "Book by phone, or just drop by. Walk-ins are always welcome.",
            },
          },
          { type: "hours", variant: "list", style: { background: "muted" } },
        ],
      },
    ],
  }),
};

export const TEMPLATES: TemplateDefinition[] = [saas, company, restaurant];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
