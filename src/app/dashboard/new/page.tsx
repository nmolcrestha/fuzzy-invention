import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NewSiteWizard } from "@/components/sites/new-site-wizard";

export const metadata: Metadata = { title: "New website" };

export default function NewSitePage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Your sites
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create a new website</h1>
        <p className="text-muted-foreground">
          Four quick steps. Nothing goes live until you choose to publish.
        </p>
      </div>
      <NewSiteWizard />
    </div>
  );
}
