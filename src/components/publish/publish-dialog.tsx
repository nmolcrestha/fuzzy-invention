"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GlobeIcon,
  Loader2Icon,
  PaletteIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteHost } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import {
  getPublishSummary,
  type PublishPageItem,
  publishChanges,
  type PublishSummary,
} from "@/server/publish/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  /** The page being edited: listed first and selected by default. */
  currentPageId?: string;
  /** Runs before publishing (e.g. save pending edits). Return false to stop. */
  beforePublish?: () => Promise<boolean>;
};

export function PublishDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {props.open && <PublishForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function PublishForm({ onOpenChange, siteId, currentPageId, beforePublish }: Props) {
  const [summary, setSummary] = useState<PublishSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [design, setDesign] = useState(false);
  // Moved pages forward their old address by default (PAGE-7); this holds the ones opted out.
  const [noRedirect, setNoRedirect] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Save the editor's pending changes first, so the summary is accurate.
      if (beforePublish && !(await beforePublish())) {
        if (!cancelled)
          setLoadError(
            "Your latest changes couldn't be saved yet, so they can't be published. Try again in a moment.",
          );
        return;
      }
      const result = await getPublishSummary(siteId);
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      const data = result.data;
      const current = data.pages.find((page) => page.id === currentPageId);
      const initial = new Set<string>(current && current.state !== "live" ? [current.id] : []);
      // A shared section edited here also changed other pages: suggest publishing them too (SEC-8a).
      if (current) {
        for (const page of data.pages) {
          if (
            page.state !== "live" &&
            page.sharedSectionIds.some((id) => current.sharedSectionIds.includes(id))
          ) {
            initial.add(page.id);
          }
        }
      }
      if (!currentPageId) {
        for (const page of data.pages) if (page.state !== "live") initial.add(page.id);
      }
      setSummary(data);
      setSelected(initial);
      setDesign(
        data.design.neverPublished ||
          (!currentPageId && data.design.changed) ||
          // A page going live that belongs in the menu needs the menu published too.
          (data.design.changed &&
            data.pages.some((page) => initial.has(page.id) && page.showInNav && !page.inLiveMenu)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, currentPageId, beforePublish]);

  const changedPages = useMemo(() => {
    if (!summary) return [];
    const list = summary.pages.filter((page) => page.state !== "live" || page.id === currentPageId);
    return list.sort((a, b) => (a.id === currentPageId ? -1 : b.id === currentPageId ? 1 : 0));
  }, [summary, currentPageId]);

  const warnings = useMemo(
    () => (summary ? collectWarnings(summary, selected, design) : []),
    [summary, selected, design],
  );

  if (loadError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Can&apos;t publish right now</DialogTitle>
          <DialogDescription>{loadError}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
        Checking what&apos;s changed…
        <DialogTitle className="sr-only">Publish</DialogTitle>
      </div>
    );
  }

  const host = siteHost(summary.site.subdomain);
  const nothingToPublish =
    changedPages.every((page) => page.state === "live") && !summary.design.changed;
  const count = selected.size + (design ? 1 : 0);

  async function handlePublish() {
    setPending(true);
    const result = await publishChanges({
      siteId,
      pageIds: [...selected],
      includeDesign: design,
      redirectPageIds: [...selected].filter((id) => !noRedirect.has(id)),
      note,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const what = [
      result.data.pageCount === 1
        ? "1 page"
        : result.data.pageCount > 1
          ? `${result.data.pageCount} pages`
          : null,
      result.data.design ? "the site design" : null,
    ]
      .filter(Boolean)
      .join(" and ");
    toast.success(`Published ${what}. Your website is live.`, {
      duration: 10_000,
      action: {
        label: "View site",
        onClick: () => window.open(result.data.url, "_blank", "noopener"),
      },
    });
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {summary.site.isLive ? "Publish changes" : "Publish your website"}
        </DialogTitle>
        <DialogDescription>
          Published changes appear on <span className="font-medium text-foreground">{host}</span>{" "}
          right away.
        </DialogDescription>
      </DialogHeader>

      {nothingToPublish ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2Icon className="size-8 text-emerald-600" aria-hidden />
          <p className="font-medium">Everything is already live</p>
          <p className="text-sm text-muted-foreground">There are no unpublished changes.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {changedPages.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Pages</legend>
              {changedPages.map((page) => (
                <PageOption
                  key={page.id}
                  page={page}
                  host={host}
                  isCurrent={page.id === currentPageId}
                  checked={selected.has(page.id)}
                  redirect={!noRedirect.has(page.id)}
                  onRedirectChange={(value) =>
                    setNoRedirect((current) => {
                      const next = new Set(current);
                      if (value) next.delete(page.id);
                      else next.add(page.id);
                      return next;
                    })
                  }
                  onChange={(checked) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(page.id);
                      else next.delete(page.id);
                      return next;
                    })
                  }
                />
              ))}
            </fieldset>
          )}

          {summary.design.changed && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Whole website</legend>
              <label
                className={cn(
                  "flex gap-3 rounded-lg border p-3",
                  design && "border-primary bg-primary/5",
                  summary.design.neverPublished && "opacity-90",
                )}
              >
                <Checkbox
                  checked={design}
                  disabled={summary.design.neverPublished}
                  onCheckedChange={(checked) => setDesign(Boolean(checked))}
                  className="mt-0.5"
                />
                <span className="grid gap-1 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <PaletteIcon className="size-4" aria-hidden />
                    Site design &amp; menu
                  </span>
                  <span className="text-muted-foreground">
                    {summary.design.neverPublished
                      ? "Colors, fonts, header, footer and menu. Needed for your first publish."
                      : "Colors, fonts, header, footer, menu and contact details. Changes apply to every page."}
                  </span>
                </span>
              </label>
            </fieldset>
          )}

          <div className="grid gap-2">
            <Label htmlFor="publish-note" className="text-sm font-medium">
              What changed? <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="publish-note"
              value={note}
              maxLength={200}
              placeholder="e.g. New summer menu"
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the version history, so you can find this version later.
            </p>
          </div>

          {warnings.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangleIcon className="size-4" aria-hidden />
                Check before you publish
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {warnings.slice(0, 8).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              {warnings.length > 8 && <p>…and {warnings.length - 8} more.</p>}
              <p className="text-xs opacity-80">
                You can still publish. These won&apos;t break your website.
              </p>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          {nothingToPublish ? "Close" : "Cancel"}
        </Button>
        {nothingToPublish ? (
          <Button onClick={() => window.open(summary.site.url, "_blank", "noopener")}>
            <ExternalLinkIcon aria-hidden />
            View live site
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={pending || count === 0}>
            {pending ? (
              <Loader2Icon className="animate-spin" aria-hidden />
            ) : (
              <GlobeIcon aria-hidden />
            )}
            {count === 0
              ? "Choose something to publish"
              : `Publish ${count === 1 ? "1 item" : `${count} items`}`}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function PageOption({
  page,
  host,
  isCurrent,
  checked,
  onChange,
  redirect,
  onRedirectChange,
}: {
  page: PublishPageItem;
  host: string;
  isCurrent: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  redirect: boolean;
  onRedirectChange: (redirect: boolean) => void;
}) {
  const upToDate = page.state === "live";
  const moving = page.livePath !== null && page.livePath !== page.path;
  const consequence = upToDate
    ? "Already live and up to date."
    : page.state === "draft"
      ? `Puts ${host}${page.path === "/" ? "" : page.path} online for the first time.`
      : moving
        ? redirect
          ? `Moves from ${page.livePath} to ${page.path}.`
          : `Moves from ${page.livePath} to ${page.path}. Links to the old address will stop working.`
        : `Updates ${host}${page.path === "/" ? "" : page.path}.`;

  return (
    <div
      className={cn("grid gap-2 rounded-lg border p-3", checked && "border-primary bg-primary/5")}
    >
      <label className="flex gap-3">
        <Checkbox
          checked={checked}
          disabled={upToDate}
          onCheckedChange={(value) => onChange(Boolean(value))}
          className="mt-0.5"
        />
        <span className="grid gap-1 text-sm">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {page.title}
            {isCurrent && <Badge variant="secondary">This page</Badge>}
            {page.state === "draft" && <Badge variant="outline">New</Badge>}
          </span>
          <span
            className={cn(
              "text-muted-foreground",
              moving && checked && !redirect && "text-amber-700 dark:text-amber-500",
            )}
          >
            {consequence}
          </span>
        </span>
      </label>
      {moving && checked && (
        <label className="ml-7 flex items-start gap-2 text-sm">
          <Checkbox
            checked={redirect}
            onCheckedChange={(value) => onRedirectChange(Boolean(value))}
            className="mt-0.5"
          />
          <span>
            Forward visitors from {page.livePath} to the new address
            <span className="block text-xs text-muted-foreground">
              Saved links and Google results keep working.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}

/** Problems for what's selected, plus links that would point at pages that aren't live. */
function collectWarnings(
  summary: PublishSummary,
  selected: Set<string>,
  design: boolean,
): string[] {
  const livePaths = new Set(
    summary.pages.flatMap((page) =>
      selected.has(page.id) ? [page.path] : page.livePath ? [page.livePath] : [],
    ),
  );
  const warnings: string[] = [];
  const brokenLinks = (title: string, links: string[]) => {
    for (const path of links) {
      if (!livePaths.has(path)) {
        warnings.push(
          `${title} links to ${path}, which isn't live. Visitors would see a “page not found” error.`,
        );
      }
    }
  };

  for (const page of summary.pages) {
    if (!selected.has(page.id)) continue;
    for (const problem of page.problems) warnings.push(`${page.title}: ${problem}`);
    brokenLinks(`“${page.title}”`, page.internalLinks);
  }
  if (design) {
    warnings.push(...summary.design.problems);
    brokenLinks("The header or footer", summary.design.internalLinks);
    const hiddenFromMenu = summary.pages.filter(
      (page) => page.showInNav && !selected.has(page.id) && page.livePath === null,
    );
    for (const page of hiddenFromMenu) {
      warnings.push(
        `“${page.title}” is in your menu but isn't published, so it won't show in the menu yet.`,
      );
    }
  }
  return [...new Set(warnings)];
}
