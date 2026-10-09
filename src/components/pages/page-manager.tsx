"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  GripVerticalIcon,
  HomeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageFormDialog } from "@/components/pages/page-form-dialog";
import { PageStatusBadge } from "@/components/sites/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  deletePage,
  duplicatePage,
  reorderPages,
  restorePage,
  setHomePage,
  setPageInNav,
} from "@/server/pages/actions";

export type PageRow = {
  id: string;
  title: string;
  path: string;
  isHome: boolean;
  showInNav: boolean;
  publishedAt: Date | null;
  hasUnpublishedChanges: boolean;
};

const UNDO_MS = 8000;

export function PageManager({
  siteId,
  subdomain,
  pages,
}: {
  siteId: string;
  subdomain: string;
  pages: PageRow[];
}) {
  // Local copy for optimistic reordering; reset whenever the server sends a new list.
  const [items, setItems] = useState(pages);
  const [serverPages, setServerPages] = useState(pages);
  if (pages !== serverPages) {
    setServerPages(pages);
    setItems(pages);
  }

  const [dialog, setDialog] = useState<{ open: boolean; page?: PageRow }>({ open: false });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function saveOrder(next: PageRow[], previous: PageRow[]) {
    setItems(next);
    const result = await reorderPages({ siteId, pageIds: next.map((page) => page.id) });
    if (!result.ok) {
      setItems(previous);
      toast.error(result.error);
    } else {
      toast.success("Page order saved. Your menu follows this order.", { id: "page-order" });
    }
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    void saveOrder(arrayMove(items, index, target), items);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((page) => page.id === active.id);
    const to = items.findIndex((page) => page.id === over.id);
    void saveOrder(arrayMove(items, from, to), items);
  }

  async function handleDelete(page: PageRow) {
    const result = await deletePage(page.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast(`Deleted “${page.title}”.`, {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: async () => {
          const restored = await restorePage(page.id);
          if (!restored.ok) toast.error(restored.error);
          else if (restored.data.pathChanged) {
            toast.success(
              `“${page.title}” is back at ${restored.data.path}, because ${page.path} is now used by another page.`,
            );
          } else toast.success(`“${page.title}” is back.`);
        },
      },
    });
  }

  async function handleSetHome(page: PageRow) {
    const previousHome = items.find((item) => item.isHome);
    const result = await setHomePage(page.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const moved = previousHome && result.data.previousHomePath;
    toast.success(
      `“${page.title}” is now your homepage.` +
        (moved ? ` “${previousHome.title}” moved to ${result.data.previousHomePath}.` : ""),
    );
  }

  async function handleToggleNav(page: PageRow) {
    const next = !page.showInNav;
    const result = await setPageInNav(page.id, next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast(
      next
        ? `“${page.title}” is now in your menu.`
        : `“${page.title}” is hidden from your menu. The page still exists.`,
      {
        duration: UNDO_MS,
        action: {
          label: "Undo",
          onClick: async () => {
            const undone = await setPageInNav(page.id, !next);
            if (!undone.ok) toast.error(undone.error);
          },
        },
      },
    );
  }

  async function handleDuplicate(page: PageRow) {
    const result = await duplicatePage(page.id);
    if (!result.ok) toast.error(result.error);
    else
      toast.success(
        `Created “${result.data.page.title}”. It's hidden from your menu until you're ready.`,
      );
  }

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="sr-only">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Your website menu follows this order.
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true })}>
          <PlusIcon aria-hidden />
          Add page
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No pages yet"
          description="Every website needs at least a homepage. Add one to get started."
          action={<Button onClick={() => setDialog({ open: true })}>Add your first page</Button>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={items.map((page) => page.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y rounded-xl border bg-card">
              {items.map((page, index) => (
                <SortablePageRow
                  key={page.id}
                  page={page}
                  editorHref={`/editor/${siteId}/${page.id}`}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  onMoveUp={() => move(index, -1)}
                  onMoveDown={() => move(index, 1)}
                  onEdit={() => setDialog({ open: true, page })}
                  onSetHome={() => handleSetHome(page)}
                  onToggleNav={() => handleToggleNav(page)}
                  onDuplicate={() => handleDuplicate(page)}
                  onDelete={() => handleDelete(page)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <PageFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        siteId={siteId}
        subdomain={subdomain}
        page={dialog.page}
      />
    </section>
  );
}

type RowProps = {
  page: PageRow;
  editorHref: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onSetHome: () => void;
  onToggleNav: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function SortablePageRow({ page, editorHref, isFirst, isLast, ...actions }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-card p-3 first:rounded-t-xl last:rounded-b-xl sm:gap-3",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${page.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={editorHref} className="truncate font-medium hover:underline">
            {page.title}
          </Link>
          {page.isHome && (
            <Badge variant="secondary" className="gap-1">
              <HomeIcon className="size-3" aria-hidden />
              Homepage
            </Badge>
          )}
          {!page.showInNav && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" className="cursor-default gap-1 text-muted-foreground" />
                }
              >
                <EyeOffIcon className="size-3" aria-hidden />
                Not in menu
              </TooltipTrigger>
              <TooltipContent>Visitors can still reach this page through links.</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{page.path}</p>
      </div>

      <ButtonLink href={editorHref} variant="outline" size="sm" className="hidden sm:inline-flex">
        <PencilIcon aria-hidden />
        Edit content
      </ButtonLink>

      <div className="hidden sm:block">
        <PageStatusBadge
          publishedAt={page.publishedAt}
          hasUnpublishedChanges={page.hasUnpublishedChanges}
        />
      </div>

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={actions.onMoveUp}
                disabled={isFirst}
              />
            }
          >
            <ArrowUpIcon aria-hidden />
            <span className="sr-only">Move {page.title} up</span>
          </TooltipTrigger>
          <TooltipContent>Move up</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={actions.onMoveDown}
                disabled={isLast}
              />
            }
          >
            <ArrowDownIcon aria-hidden />
            <span className="sr-only">Move {page.title} down</span>
          </TooltipTrigger>
          <TooltipContent>Move down</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontalIcon aria-hidden />
            <span className="sr-only">More actions for {page.title}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={actions.onEdit}>
              <PencilIcon aria-hidden />
              Rename or change address
            </DropdownMenuItem>
            {!page.isHome && (
              <DropdownMenuItem onClick={actions.onSetHome}>
                <HomeIcon aria-hidden />
                Set as homepage
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={actions.onToggleNav}>
              {page.showInNav ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
              {page.showInNav ? "Hide from menu" : "Show in menu"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={actions.onDuplicate}>
              <CopyIcon aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {page.isHome ? (
              <DropdownMenuItem disabled>
                <Trash2Icon aria-hidden />
                Can&apos;t delete the homepage
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onClick={actions.onDelete}>
                <Trash2Icon aria-hidden />
                Delete page
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
