"use client";

import { CheckIcon, PartyPopperIcon, XIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dismissChecklist } from "@/server/sites/actions";
import type { ChecklistItem } from "@/server/sites/queries";

/**
 * Getting-started checklist (requirement ONB-5). Steps tick themselves off from the site's real
 * state. `actions` puts a button or link next to a step that isn't done yet.
 */
export function GettingStarted({
  siteId,
  items,
  actions = {},
  compact = false,
}: {
  siteId: string;
  items: ChecklistItem[];
  actions?: Partial<Record<ChecklistItem["id"], ReactNode>>;
  compact?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const doneCount = items.filter((item) => item.done).length;
  const allDone = doneCount === items.length;

  async function dismiss() {
    setHidden(true);
    const result = await dismissChecklist(siteId);
    if (!result.ok) {
      setHidden(false);
      toast.error(result.error);
    }
  }

  return (
    <section
      aria-labelledby={`getting-started-${siteId}`}
      className={cn("rounded-xl border bg-card", compact ? "p-4" : "p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`getting-started-${siteId}`} className="flex items-center gap-2 font-semibold">
            {allDone && <PartyPopperIcon className="size-4 text-primary" aria-hidden />}
            {allDone ? "You're all set!" : "Get your website ready"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {allDone
              ? "Your website is live. Keep it fresh by updating it now and then."
              : `${doneCount} of ${items.length} done`}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Hide this checklist">
          <XIcon aria-hidden />
        </Button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                item.done && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {item.done && <CheckIcon className="size-3.5" aria-hidden />}
              <span className="sr-only">{item.done ? "Done:" : "To do:"}</span>
            </span>
            <div
              className={cn(
                "min-w-0 flex-1",
                compact ? "grid gap-1" : "flex flex-wrap items-start justify-between gap-2",
              )}
            >
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.done && "text-muted-foreground line-through",
                  )}
                >
                  {item.label}
                </p>
                {!item.done && <p className="text-sm text-muted-foreground">{item.hint}</p>}
              </div>
              {!item.done && actions[item.id]}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
