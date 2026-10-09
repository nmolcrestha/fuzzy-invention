"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  HomeIcon,
  LayersIcon,
  MonitorIcon,
  Redo2Icon,
  SettingsIcon,
  SmartphoneIcon,
  TabletIcon,
  Undo2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useEditorMeta } from "./editor-meta";
import { SaveStatus } from "./save-status";
import { type Device, useEditor } from "./store";

const DEVICES: { id: Device; label: string; icon: typeof MonitorIcon }[] = [
  { id: "desktop", label: "Desktop", icon: MonitorIcon },
  { id: "tablet", label: "Tablet", icon: TabletIcon },
  { id: "mobile", label: "Phone", icon: SmartphoneIcon },
];

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

function IconButton({
  label,
  shortcut,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; shortcut?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} {...props} />}
      />
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-2 opacity-70">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopBar({
  onNavigate,
  onRetrySave,
  onOpenSections,
  onOpenSettings,
}: {
  onNavigate: (href: string) => void;
  onRetrySave: () => void;
  onOpenSections: () => void;
  onOpenSettings: () => void;
}) {
  const { site, page, pages } = useEditorMeta();
  const device = useEditor((state) => state.device);
  const setDevice = useEditor((state) => state.setDevice);
  const canUndo = useEditor((state) => state.past.length > 0);
  const canRedo = useEditor((state) => state.future.length > 0);
  const undo = useEditor((state) => state.undo);
  const redo = useEditor((state) => state.redo);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
      <IconButton label="Back to pages" onClick={() => onNavigate(`/dashboard/sites/${site.id}`)}>
        <ArrowLeftIcon aria-hidden />
      </IconButton>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="max-w-60 min-w-0 justify-start gap-1 px-2" />}
        >
          <span className="truncate">
            <span className="hidden text-muted-foreground sm:inline">{site.name} / </span>
            <span className="font-medium">{page.title}</span>
          </span>
          <ChevronDownIcon className="shrink-0 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Edit another page</DropdownMenuLabel>
            {pages.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => item.id !== page.id && onNavigate(`/editor/${site.id}/${item.id}`)}
              >
                {item.isHome ? <HomeIcon aria-hidden /> : <span className="size-4" />}
                <span className="flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.path}</span>
                {item.id === page.id && <CheckIcon aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        className="mx-auto hidden items-center gap-0.5 rounded-lg bg-muted p-0.5 md:flex"
        role="radiogroup"
        aria-label="Preview size"
      >
        {DEVICES.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  role="radio"
                  aria-checked={device === item.id}
                  aria-label={`${item.label} preview`}
                  onClick={() => setDevice(item.id)}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
                />
              }
            >
              <item.icon className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <div className="hidden lg:block">
          <SaveStatus onRetry={onRetrySave} />
        </div>
        <IconButton label="Undo" shortcut={`${mod}+Z`} disabled={!canUndo} onClick={undo}>
          <Undo2Icon aria-hidden />
        </IconButton>
        <IconButton label="Redo" shortcut={`${mod}+Shift+Z`} disabled={!canRedo} onClick={redo}>
          <Redo2Icon aria-hidden />
        </IconButton>
        <div className="flex lg:hidden">
          <IconButton label="Sections" onClick={onOpenSections}>
            <LayersIcon aria-hidden />
          </IconButton>
          <IconButton label="Section settings" onClick={onOpenSettings}>
            <SettingsIcon aria-hidden />
          </IconButton>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => window.open(`/preview/${page.id}`, "_blank", "noopener")}
        >
          <ExternalLinkIcon aria-hidden />
          Preview
        </Button>
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} />}>
            <Button size="sm" disabled>
              Publish
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-60">
            Publishing arrives in the next update. Your changes are safely saved as a draft.
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
