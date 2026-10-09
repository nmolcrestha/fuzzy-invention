// Shared between client forms and server actions.
import { z } from "zod";

import { normalizePath, pathProblem, subdomainProblem } from "@/lib/slug";

export const SITE_KINDS = [
  { value: "saas", label: "SaaS / app", hint: "Landing page with features, pricing and FAQ" },
  { value: "company", label: "Company", hint: "About, services, team and contact" },
  { value: "restaurant", label: "Restaurant / café", hint: "Menu, opening hours and location" },
  { value: "other", label: "Something else", hint: "Start simple and add what you need" },
] as const;

const siteKind = z.enum(["saas", "company", "restaurant", "other"]);

const siteName = z
  .string()
  .trim()
  .min(1, "Give your website a name.")
  .max(80, "Keep the name under 80 characters.");

export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((value, ctx) => {
    const problem = subdomainProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const createSiteSchema = z.object({
  name: siteName,
  kind: siteKind,
  subdomain: subdomainSchema,
});

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().default("");

export const updateSiteSchema = z.object({
  siteId: z.uuid(),
  name: siteName,
  subdomain: subdomainSchema,
  contactEmail: z
    .union([z.literal(""), z.email("That doesn't look like a valid email address.")])
    .optional()
    .default(""),
  phone: optionalText(40, "That phone number is too long."),
  address: optionalText(200, "Keep the address under 200 characters."),
});

const pageTitle = z
  .string()
  .trim()
  .min(1, "Give the page a title.")
  .max(80, "Keep the title under 80 characters.");

/** Accepts loose input ("About Us") and turns it into a clean path ("/about-us"). */
const pagePath = z
  .string()
  .transform((value) => normalizePath(value))
  .superRefine((value, ctx) => {
    const problem = pathProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export const createPageSchema = z.object({
  siteId: z.uuid(),
  title: pageTitle,
  /** Empty means "generate from the title". */
  path: z
    .union([z.literal(""), pagePath])
    .optional()
    .default(""),
  showInNav: z.boolean().default(true),
});

export const updatePageSchema = z.object({
  pageId: z.uuid(),
  title: pageTitle,
  path: pagePath,
});

export const reorderPagesSchema = z.object({
  siteId: z.uuid(),
  pageIds: z.array(z.uuid()).min(1),
});

export type CreateSiteInput = z.input<typeof createSiteSchema>;
export type UpdateSiteInput = z.input<typeof updateSiteSchema>;
export type CreatePageInput = z.input<typeof createPageSchema>;
export type UpdatePageInput = z.input<typeof updatePageSchema>;
