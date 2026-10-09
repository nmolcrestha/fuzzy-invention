import type { Metadata } from "next";
import { Suspense } from "react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Side Quest" } };

async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu user={user} />;
}

/** Renders children only for a signed-in user; otherwise `requireUser` redirects to /login. */
async function RequireUser({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <AppSidebar
        footer={
          <Suspense fallback={<Skeleton className="h-12 w-full" />}>
            <CurrentUserMenu />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-8">
          <Suspense fallback={<ContentSkeleton />}>
            <RequireUser>{children}</RequireUser>
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
