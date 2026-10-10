"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SiteTabs({ siteId, unread = 0 }: { siteId: string; unread?: number }) {
  const pathname = usePathname();
  const base = `/dashboard/sites/${siteId}`;
  const tabs: { href: string; label: string; count?: number }[] = [
    { href: base, label: "Pages" },
    { href: `${base}/design`, label: "Design" },
    { href: `${base}/menu`, label: "Menu & social" },
    { href: `${base}/media`, label: "Media" },
    { href: `${base}/inbox`, label: "Messages", count: unread },
    { href: `${base}/history`, label: "History" },
    { href: `${base}/settings`, label: "Settings" },
    { href: `${base}/activity`, label: "Activity" },
  ];

  return (
    <nav aria-label="Website sections" className="-mb-px flex gap-6 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {(tab.count ?? 0) > 0 && (
              <>
                {" "}
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
                  {tab.count}
                  <span className="sr-only"> unread</span>
                </span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
