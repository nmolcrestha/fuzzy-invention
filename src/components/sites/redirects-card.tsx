"use client";

import { ArrowRightIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteRedirect } from "@/server/redirects/actions";

/** Old addresses that forward visitors to a page's new address (requirement PAGE-7). */
export function RedirectsCard({
  siteId,
  redirects,
}: {
  siteId: string;
  redirects: { id: string; fromPath: string; toPath: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forwarded addresses</CardTitle>
        <CardDescription>
          When a published page moves, its old address can forward visitors to the new one. They
          appear here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {redirects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing is forwarded yet. You&apos;ll be asked when you publish a page with a new
            address.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {redirects.map((redirect) => (
              <li key={redirect.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-mono">{redirect.fromPath}</span>
                <ArrowRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-label="goes to"
                />
                <span className="min-w-0 flex-1 truncate font-mono">{redirect.toPath}</span>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <Trash2Icon aria-hidden />
                      <span className="sr-only">Stop forwarding {redirect.fromPath}</span>
                    </Button>
                  }
                  title={`Stop forwarding ${redirect.fromPath}?`}
                  description="This takes effect on your live website right away."
                  consequences={[
                    `Visitors to ${redirect.fromPath} will see a “page not found” error instead of ${redirect.toPath}.`,
                  ]}
                  confirmLabel="Stop forwarding"
                  tone="destructive"
                  onConfirm={async () => {
                    const result = await deleteRedirect({ siteId, redirectId: redirect.id });
                    if (!result.ok) throw new Error(result.error);
                    toast.success(`${redirect.fromPath} no longer forwards.`);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
