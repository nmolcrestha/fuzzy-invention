import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { SiteNavigation } from "@/sections/navigation";
import type { SiteTheme } from "@/sections/theme";

import { user } from "./auth";

export const siteStatus = pgEnum("site_status", ["draft", "live", "offline"]);

export type SiteKind = "saas" | "company" | "restaurant" | "other";

export type SiteSettings = {
  contactEmail?: string;
  phone?: string;
  address?: string;
  /** The getting-started checklist was closed by the user. */
  checklistDismissed?: boolean;
  /** Shown in the header instead of the site name's first letter. */
  logo?: { src: string; alt: string };
  /** Browser-tab icon for the live site. */
  favicon?: string;
  /** Used when a page has no social image of its own. */
  socialImage?: string;
  /** Email the owner about new form messages (default on). */
  formNotifications?: boolean;
};

export type SectionStyle = {
  background?: "default" | "muted" | "primary" | "dark";
  spacing?: "compact" | "normal" | "spacious";
  anchorId?: string;
};

/** A site-wide block (header or footer): same shape as a section, stored on the site. */
export type ChromeBlock = {
  type: string;
  variant: string;
  schemaVersion: number;
  data: Record<string, unknown>;
  style: SectionStyle;
};

export type PageSeo = {
  title?: string;
  description?: string;
  /** Image shown when the page is shared on social media. */
  image?: string;
  noindex?: boolean;
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").$type<SiteKind>().notNull().default("other"),
    // Kept unique even for soft-deleted sites so a restore never collides.
    subdomain: text("subdomain").notNull().unique(),
    customDomain: text("custom_domain").unique(),
    templateKey: text("template_key"),
    theme: jsonb("theme").$type<Partial<SiteTheme>>().notNull().default({}),
    settings: jsonb("settings").$type<SiteSettings>().notNull().default({}),
    navigation: jsonb("navigation").$type<Partial<SiteNavigation>>().notNull().default({}),
    // Site design blocks shown on every page. Null = use the section type's defaults.
    header: jsonb("header").$type<ChromeBlock>(),
    footer: jsonb("footer").$type<ChromeBlock>(),
    // Bumped on every save of site design; guards against two tabs overwriting each other.
    designRevision: integer("design_revision").notNull().default(0),
    status: siteStatus("status").notNull().default("draft"),
    designHasUnpublishedChanges: boolean("design_has_unpublished_changes").notNull().default(true),
    /** The live site design. Null until the first publish. */
    publishedVersionId: uuid("published_version_id").references(
      (): AnyPgColumn => siteVersions.id,
      {
        onDelete: "set null",
      },
    ),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("sites_owner_id_idx").on(table.ownerId)],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    path: text("path").notNull(),
    isHome: boolean("is_home").notNull().default(false),
    showInNav: boolean("show_in_nav").notNull().default(true),
    position: integer("position").notNull().default(0),
    seo: jsonb("seo").$type<PageSeo>().notNull().default({}),
    hasUnpublishedChanges: boolean("has_unpublished_changes").notNull().default(true),
    /** The live version of this page. Null = never published (or unpublished). */
    publishedVersionId: uuid("published_version_id").references(
      (): AnyPgColumn => pageVersions.id,
      {
        onDelete: "set null",
      },
    ),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** The live address, used to route visitors (the draft path may differ). */
    publishedPath: text("published_path"),
    // Bumped on every editor save; guards against two tabs overwriting each other.
    draftRevision: integer("draft_revision").notNull().default(0),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("pages_site_id_idx").on(table.siteId),
    // A path is unique among a site's live (non-deleted) pages.
    uniqueIndex("pages_site_path_unique")
      .on(table.siteId, table.path)
      .where(sql`${table.deletedAt} is null`),
    index("pages_site_published_path_idx").on(table.siteId, table.publishedPath),
    // At most one homepage per site.
    uniqueIndex("pages_site_home_unique")
      .on(table.siteId)
      .where(sql`${table.isHome} and ${table.deletedAt} is null`),
  ],
);

export const sections = pgTable(
  "sections",
  {
    // Generated by the editor (crypto.randomUUID) so new sections can be saved idempotently.
    id: uuid("id").primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    variant: text("variant").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    style: jsonb("style").$type<SectionStyle>().notNull().default({}),
    // Saved-section library (Phase 5).
    isShared: boolean("is_shared").notNull().default(false),
    libraryName: text("library_name"),
    // Bumped when a shared section's content changes; guards against overwriting edits made from
    // another page.
    revision: integer("revision").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("sections_site_id_idx").on(table.siteId)],
);

/** Places a section on a page. A shared section can be placed on many pages (Phase 5). */
export const pageSections = pgTable(
  "page_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
  },
  (table) => [
    index("page_sections_page_id_idx").on(table.pageId, table.position),
    uniqueIndex("page_sections_page_section_unique").on(table.pageId, table.sectionId),
  ],
);

/** Immutable snapshot of the site design (theme, header/footer, menu) at publish time. */
export const siteVersions = pgTable(
  "site_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    note: text("note"),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("site_versions_site_created_idx").on(table.siteId, table.createdAt)],
);

/** Immutable snapshot of one page (with its sections resolved) at publish time. */
export const pageVersions = pgTable(
  "page_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    note: text("note"),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("page_versions_page_created_idx").on(table.pageId, table.createdAt)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      // clock_timestamp() (not now()) so entries written in one transaction keep their order.
      .default(sql`clock_timestamp()`),
  },
  (table) => [index("activity_log_site_created_idx").on(table.siteId, table.createdAt)],
);

/** An uploaded image. Kept in storage while any published version still uses it. */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    /** Blob pathname (or the local file name in development). */
    storageKey: text("storage_key").notNull().unique(),
    url: text("url").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt").notNull().default(""),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("media_assets_site_created_idx").on(table.siteId, table.createdAt)],
);

/** Sends visitors from an old live address to a page's new one. */
export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("redirects_site_from_unique").on(table.siteId, table.fromPath)],
);

export type SubmissionField = { label: string; value: string };

/** A message sent through a contact form on a live site. */
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    sectionId: uuid("section_id"),
    pageTitle: text("page_title").notNull().default(""),
    data: jsonb("data").$type<{ fields: SubmissionField[] }>().notNull(),
    isRead: boolean("is_read").notNull().default(false),
    /** Salted hash of the sender's IP, only used for rate limiting. */
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("form_submissions_site_created_idx").on(table.siteId, table.createdAt),
    index("form_submissions_ip_created_idx").on(table.ipHash, table.createdAt),
  ],
);

export type Site = typeof sites.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type PageSection = typeof pageSections.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type Redirect = typeof redirects.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;
