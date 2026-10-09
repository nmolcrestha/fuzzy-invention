"use client";

import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { restoreSite } from "@/server/sites/actions";

type DeletedSite = { id: string; name: string; deletedAt: Date | null };

export function DeletedSites({
  sites,
  retentionDays,
}: {
  sites: DeletedSite[];
  retentionDays: number;
}) {
  const [restoring, setRestoring] = useState<string | null>(null);

  async function handleRestore(site: DeletedSite) {
    setRestoring(site.id);
    const result = await restoreSite(site.id);
    setRestoring(null);
    if (result.ok) toast.success(`“${site.name}” is back.`);
    else toast.error(result.error);
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">Recently deleted</h2>
        <p className="text-sm text-muted-foreground">
          Deleted websites are kept for {retentionDays} days, then removed for good.
        </p>
      </div>
      <ul className="divide-y rounded-xl border">
        {sites.map((site) => {
          const removeOn = site.deletedAt
            ? new Date(site.deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
            : null;
          return (
            <li key={site.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{site.name}</p>
                {removeOn && (
                  <p className="text-sm text-muted-foreground">
                    Removed for good on {formatDate(removeOn)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={restoring === site.id}
                onClick={() => handleRestore(site)}
              >
                {restoring === site.id ? (
                  <Loader2Icon className="animate-spin" aria-hidden />
                ) : (
                  <RotateCcwIcon aria-hidden />
                )}
                Restore
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
