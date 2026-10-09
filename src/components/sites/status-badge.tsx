import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Tone = "live" | "changed" | "draft" | "offline";

const DOT: Record<Tone, string> = {
  live: "bg-emerald-500",
  changed: "bg-amber-500",
  draft: "bg-muted-foreground/50",
  offline: "bg-destructive",
};

function StatusBadge({
  tone,
  label,
  explanation,
}: {
  tone: Tone;
  label: string;
  explanation: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant="outline" className="cursor-default gap-1.5" />}>
        <span className={cn("size-2 rounded-full", DOT[tone])} aria-hidden />
        {label}
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{explanation}</TooltipContent>
    </Tooltip>
  );
}

export function SiteStatusBadge({
  status,
  changeCount = 0,
}: {
  status: "draft" | "live" | "offline";
  /** Pages with unpublished changes, plus 1 if the site design changed. */
  changeCount?: number;
}) {
  if (status === "offline") {
    return (
      <StatusBadge
        tone="offline"
        label="Offline"
        explanation="Your website is switched off. Visitors see a “site not available” page."
      />
    );
  }
  if (status === "draft") {
    return (
      <StatusBadge
        tone="draft"
        label="Draft"
        explanation="Nothing is published yet. Only you can see this website."
      />
    );
  }
  if (changeCount > 0) {
    const pages = changeCount === 1 ? "there's 1 change" : `there are ${changeCount} changes`;
    return (
      <StatusBadge
        tone="changed"
        label="Live · unpublished changes"
        explanation={`Your website is live, but ${pages} visitors can't see yet.`}
      />
    );
  }
  return (
    <StatusBadge tone="live" label="Live" explanation="Your website is live and up to date." />
  );
}

export function PageStatusBadge({
  publishedAt,
  hasUnpublishedChanges,
}: {
  publishedAt: Date | null;
  hasUnpublishedChanges: boolean;
}) {
  if (!publishedAt) {
    return (
      <StatusBadge
        tone="draft"
        label="Draft"
        explanation="Never published. Visitors can't see this page yet."
      />
    );
  }
  if (hasUnpublishedChanges) {
    return (
      <StatusBadge
        tone="changed"
        label="Changed"
        explanation="Visitors see the last published version. Publish to show your latest changes."
      />
    );
  }
  return <StatusBadge tone="live" label="Live" explanation="Published and up to date." />;
}
