"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/sites/${siteId}`;
  const tabs = [
    { href: base, label: "Pages" },
    { href: `${base}/design`, label: "Design" },
    { href: `${base}/menu`, label: "Menu & social" },
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
          </Link>
        );
      })}
    </nav>
  );
}
