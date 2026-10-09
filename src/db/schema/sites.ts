import { sql } from "drizzle-orm";
import {
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

import { user } from "./auth";

export const siteStatus = pgEnum("site_status", ["draft", "live", "offline"]);

export type SiteKind = "saas" | "company" | "restaurant" | "other";

export type SiteSettings = {
  contactEmail?: string;
  phone?: string;
  address?: string;
};

export type PageSeo = {
  title?: string;
  description?: string;
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
    theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
    settings: jsonb("settings").$type<SiteSettings>().notNull().default({}),
    navigation: jsonb("navigation").$type<Record<string, unknown>>().notNull().default({}),
    status: siteStatus("status").notNull().default("draft"),
    designHasUnpublishedChanges: boolean("design_has_unpublished_changes").notNull().default(true),
    // FK to site_versions is added in Phase 3 together with that table.
    publishedVersionId: uuid("published_version_id"),
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
    // FK to page_versions is added in Phase 3 together with that table.
    publishedVersionId: uuid("published_version_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("pages_site_id_idx").on(table.siteId),
    // A path is unique among a site's live (non-deleted) pages.
    uniqueIndex("pages_site_path_unique")
      .on(table.siteId, table.path)
      .where(sql`${table.deletedAt} is null`),
    // At most one homepage per site.
    uniqueIndex("pages_site_home_unique")
      .on(table.siteId)
      .where(sql`${table.isHome} and ${table.deletedAt} is null`),
  ],
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

export type Site = typeof sites.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;
