import { HistoryIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { describeActivity } from "@/lib/activity-text";
import { formatDateTime, timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getMySiteOr404, listActivity } from "@/server/sites/queries";

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/sites/[siteId]/activity">): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getMySiteOr404(siteId);
  return { title: `${site.name} · Activity` };
}

export default async function SiteActivityPage({
  params,
}: PageProps<"/dashboard/sites/[siteId]/activity">) {
  const { siteId } = await params;
  const [me, entries] = await Promise.all([requireUser(), listActivity(siteId)]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="No activity yet"
        description="Changes to this website will show up here, so you always know what happened and when."
      />
    );
  }

  return (
    <section className="space-y-4 pt-2">
      <div>
        <h2 className="sr-only">Activity</h2>
        <p className="text-sm text-muted-foreground">The latest 50 changes to this website.</p>
      </div>
      <ol className="divide-y rounded-xl border">
        {entries.map((entry) => {
          const actor = entry.userId === me.id ? "You" : (entry.userName ?? "Someone");
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4"
            >
              <p className="text-sm">
                <span className="font-medium">{actor}</span> {describeActivity(entry)}
              </p>
              <time
                dateTime={entry.createdAt.toISOString()}
                title={formatDateTime(entry.createdAt)}
                className="shrink-0 text-sm text-muted-foreground"
              >
                {timeAgo(entry.createdAt)}
              </time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
