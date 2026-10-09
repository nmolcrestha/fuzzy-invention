import { GlobeIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your sites" };

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">Here are your websites.</p>
        </div>
      </div>

      {/* Site creation arrives in Phase 1 (requirement §13). */}
      <EmptyState
        icon={GlobeIcon}
        title="You don't have a website yet"
        description="Pick what you're building (a SaaS landing page, a company site or a restaurant) and we'll set up a ready-to-edit site for you."
        action={
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} />}>
              <Button disabled>
                <PlusIcon aria-hidden />
                Create your first site
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        }
      />
    </div>
  );
}
