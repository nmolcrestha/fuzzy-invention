import "server-only";

import type { db } from "@/db";
import { activityLog } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export type ActivityAction =
  | "site.created"
  | "site.updated"
  | "site.deleted"
  | "site.restored"
  | "site.design_edited"
  | "site.published"
  | "site.theme_changed"
  | "site.menu_changed"
  | "page.unpublished"
  | "page.content_edited"
  | "page.created"
  | "page.updated"
  | "page.duplicated"
  | "page.deleted"
  | "page.restored"
  | "page.set_home"
  | "page.nav_changed"
  | "pages.reordered"
  | "page.seo_changed"
  | "page.version_restored"
  | "page.changes_discarded"
  | "site.design_restored"
  | "site.design_discarded"
  | "media.uploaded"
  | "media.deleted"
  | "section.saved_to_library"
  | "section.removed_from_library"
  | "redirect.deleted";

export async function logActivity(
  tx: Tx,
  entry: {
    siteId: string;
    userId: string;
    action: ActivityAction;
    entityType: "site" | "page" | "media" | "section";
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(activityLog).values({
    siteId: entry.siteId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
  });
}
