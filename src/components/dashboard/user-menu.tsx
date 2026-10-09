"use client";

import { ChevronsUpDownIcon, LogOutIcon, MonitorSmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { authClient, signOut } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import type { CurrentUser } from "@/lib/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    router.push("/login");
    router.refresh();
  }

  async function handleSignOutOthers() {
    const { error } = await authClient.revokeOtherSessions();
    if (error) throw new Error(authErrorMessage(error));
    toast.success("You've been logged out on all other devices.");
  }

  const identity = (
    <>
      <Avatar className="size-8 rounded-lg">
        {user.image && <AvatarImage src={user.image} alt="" />}
        <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="Account menu" />}>
            {identity}
            <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                {identity}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem closeOnClick={false}>
                  <MonitorSmartphoneIcon aria-hidden />
                  Log out other devices
                </DropdownMenuItem>
              }
              title="Log out on all other devices?"
              description="Use this if you logged in on a shared or lost device."
              consequences={[
                "Every other browser and device will be logged out right away.",
                "You'll stay logged in here.",
              ]}
              confirmLabel="Log out other devices"
              onConfirm={handleSignOutOthers}
            />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOutIcon aria-hidden />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
