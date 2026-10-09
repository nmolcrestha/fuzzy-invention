import "server-only";

import type { db } from "@/db";
import { activityLog } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export type ActivityAction =
  | "site.created"
  | "site.updated"
  | "site.deleted"
  | "site.restored"
  | "page.created"
  | "page.updated"
  | "page.duplicated"
  | "page.deleted"
  | "page.restored"
  | "page.set_home"
  | "page.nav_changed"
  | "pages.reordered";

export async function logActivity(
  tx: Tx,
  entry: {
    siteId: string;
    userId: string;
    action: ActivityAction;
    entityType: "site" | "page";
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
