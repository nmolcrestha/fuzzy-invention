"use client";

import { ExternalLinkIcon, HistoryIcon, RotateCcwIcon, Undo2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  discardDesignChanges,
  discardPageChanges,
  restorePageVersion,
  restoreSiteVersion,
} from "@/server/versions/actions";
import type { VersionRow } from "@/server/versions/queries";

type Item =
  | {
      kind: "page";
      id: string;
      title: string;
      changed: boolean;
      published: boolean;
      editorHref: string;
    }
  | { kind: "design"; siteId: string; changed: boolean; published: boolean };

/** Versions of one page (or of the site design), with restore and discard (PUB-8, PUB-9). */
export function VersionList({ item, versions }: { item: Item; versions: VersionRow[] }) {
  const router = useRouter();
  const name = item.kind === "page" ? `“${item.title}”` : "the site design";

  async function restore(version: VersionRow) {
    const result =
      item.kind === "page"
        ? await restorePageVersion({ pageId: item.id, versionId: version.id })
        : await restoreSiteVersion({ siteId: item.siteId, versionId: version.id });
    if (!result.ok) throw new Error(result.error);
    toast.success(
      `Restored the version from ${formatDateTime(new Date(version.createdAt))}. Publish ${item.kind === "page" ? "the page" : "the site design"} to show it on your website.`,
      item.kind === "page"
        ? {
            action: { label: "Open in editor", onClick: () => router.push(item.editorHref) },
          }
        : undefined,
    );
  }

  async function discard() {
    if (item.kind === "page") {
      const result = await discardPageChanges(item.id);
      if (!result.ok) throw new Error(result.error);
      toast.success(
        result.data.addressKept
          ? `Discarded the changes to ${name}. It kept its new address because another page now uses the old one.`
          : `Discarded the changes to ${name}. The draft matches your live page again.`,
      );
    } else {
      const result = await discardDesignChanges(item.siteId);
      if (!result.ok) throw new Error(result.error);
      toast.success(
        result.data.menuStillChanged
          ? "Discarded the design changes. Your page list changed the menu, so it still needs publishing."
          : "Discarded the design changes. The draft matches your live website again.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {item.changed && item.published && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>
            {item.kind === "page" ? "This page has" : "The site design has"} unpublished changes.
          </p>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline" className="bg-background">
                <Undo2Icon aria-hidden />
                Discard unpublished changes
              </Button>
            }
            title={`Discard the changes to ${name}?`}
            description="The draft goes back to exactly what's live now."
            consequences={[
              "Every edit since the last publish is thrown away.",
              "Your live website doesn't change.",
              "You can't undo this, but earlier versions stay in this history.",
            ]}
            confirmLabel="Discard changes"
            tone="destructive"
            onConfirm={discard}
          />
        </div>
      )}

      {versions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Not published yet"
          description={`Each time you publish ${name}, a version is saved here so you can go back to it.`}
        />
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {versions.map((version) => (
            <li key={version.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <time
                    dateTime={version.createdAt}
                    title={formatDateTime(new Date(version.createdAt))}
                  >
                    {formatDateTime(new Date(version.createdAt))}
                  </time>
                  {version.isLive && (
                    <Badge variant="outline" className="gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                      Live now
                    </Badge>
                  )}
                </p>
                {version.note && <p className="text-sm">“{version.note}”</p>}
                <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                  Published {timeAgo(new Date(version.createdAt))}
                  {version.publishedBy ? ` by ${version.publishedBy}` : ""} · {version.summary}
                </p>
              </div>
              <div className="flex gap-2">
                {item.kind === "page" && (
                  <a
                    href={`/preview/version/${version.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                  >
                    <ExternalLinkIcon className="size-4" aria-hidden />
                    View
                  </a>
                )}
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <RotateCcwIcon aria-hidden />
                      Restore
                    </Button>
                  }
                  title="Restore this version?"
                  description={`The draft of ${name} is replaced with the version from ${formatDateTime(new Date(version.createdAt))}.`}
                  consequences={[
                    item.kind === "page"
                      ? "Its sections, title and search settings come back. The page keeps its current address."
                      : "Colors, fonts, header, footer, menu links, logo and contact details come back.",
                    "Your live website doesn't change until you publish.",
                    "Unpublished edits are replaced. Published versions stay in this history.",
                  ]}
                  confirmLabel="Restore to draft"
                  onConfirm={() => restore(version)}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
