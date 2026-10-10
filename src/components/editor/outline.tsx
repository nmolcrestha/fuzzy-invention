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
  GlobeIcon,
  GripVerticalIcon,
  LayersIcon,
  Link2Icon,
  Link2OffIcon,
  MoreHorizontalIcon,
  PanelBottomIcon,
  PanelTopIcon,
  PlusIcon,
  BookmarkPlusIcon,
  Trash2Icon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
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
import type { Field } from "@/sections/fields";
import { getSectionDef, type SectionBlock } from "@/sections/registry";

import { useEditorActions } from "./editor-meta";
import { useEditor, useEditorStore } from "./store";
import { useSectionActions } from "./use-section-actions";

/** A short line of the section's own text, so similar sections are easy to tell apart. */
function summary(block: SectionBlock): string {
  const def = getSectionDef(block.type);
  if (!def) return "";
  for (const [key, field] of Object.entries(def.fields) as [string, Field][]) {
    if (
      field.kind === "text" &&
      typeof block.data[key] === "string" &&
      (block.data[key] as string).trim()
    ) {
      return block.data[key] as string;
    }
  }
  return def.description;
}

export function Outline({ onAdd }: { onAdd: (index: number) => void }) {
  const sections = useEditor((state) => state.doc.sections);
  const store = useEditorStore();
  const actions = useSectionActions();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((block) => block.id === active.id);
    const to = sections.findIndex((block) => block.id === over.id);
    actions.move(from, to);
  }

  const selectFromList = (id: string) => {
    store.getState().select(id);
    store.getState().requestScroll(id);
  };

  return (
    <nav aria-label="Page sections" className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Sections</h2>
        <Button size="sm" onClick={() => onAdd(sections.length)}>
          <PlusIcon aria-hidden />
          Add section
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        <ChromeRow id="header" label="Header" icon={PanelTopIcon} onSelect={selectFromList} />

        {sections.length === 0 ? (
          <EmptyState
            icon={LayersIcon}
            title="This page is empty"
            description="Start with a Hero section: a headline and a button."
            className="my-2 px-4 py-8"
            action={
              <Button size="sm" onClick={() => onAdd(0)}>
                <PlusIcon aria-hidden />
                Add a section
              </Button>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((block) => block.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {sections.map((block, index) => (
                  <SortableRow
                    key={block.id}
                    block={block}
                    index={index}
                    count={sections.length}
                    onSelect={selectFromList}
                    onAddBelow={() => onAdd(index + 1)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <ChromeRow id="footer" label="Footer" icon={PanelBottomIcon} onSelect={selectFromList} />
      </div>
    </nav>
  );
}

function ChromeRow({
  id,
  label,
  icon: Icon,
  onSelect,
}: {
  id: "header" | "footer";
  label: string;
  icon: typeof PanelTopIcon;
  onSelect: (id: string) => void;
}) {
  const selected = useEditor((state) => state.selectedId === id);
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-current={selected || undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm hover:bg-muted",
        selected && "border-solid border-primary bg-primary/5",
      )}
    >
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span className="flex-1 font-medium">{label}</span>
      <Tooltip>
        <TooltipTrigger render={<span className="text-muted-foreground" />}>
          <GlobeIcon className="size-3.5" aria-hidden />
          <span className="sr-only">Shown on every page</span>
        </TooltipTrigger>
        <TooltipContent>Shown on every page</TooltipContent>
      </Tooltip>
    </button>
  );
}

function SortableRow({
  block,
  index,
  count,
  onSelect,
  onAddBelow,
}: {
  block: SectionBlock;
  index: number;
  count: number;
  onSelect: (id: string) => void;
  onAddBelow: () => void;
}) {
  const selected = useEditor((state) => state.selectedId === block.id);
  const hovered = useEditor((state) => state.hoveredId === block.id);
  const hover = useEditor((state) => state.hover);
  const shared = useEditor((state) => state.shared[block.id]);
  const actions = useSectionActions();
  const { saveForReuse } = useEditorActions();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const def = getSectionDef(block.type);
  const name = def?.name ?? block.type;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onMouseEnter={() => hover(block.id)}
      onMouseLeave={() => hover(null)}
      className={cn(
        "group flex items-center gap-1 rounded-lg border bg-background p-1 pr-1.5",
        selected && "border-primary bg-primary/5",
        hovered && !selected && "border-primary/40",
        isDragging && "relative z-10 shadow-lg",
        block.isHidden && "opacity-60",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to reorder ${name}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onSelect(block.id)}
        aria-current={selected || undefined}
        className="min-w-0 flex-1 py-1 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {name}
          {shared && (
            <span className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1 text-[11px] font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-200">
              <Link2Icon className="size-3" aria-hidden />
              Shared
            </span>
          )}
          {block.isHidden && (
            <EyeOffIcon className="size-3.5 text-muted-foreground" aria-label="Hidden" />
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{summary(block)}</span>
      </button>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
              onClick={() => actions.toggleHidden(block.id)}
            />
          }
        >
          {block.isHidden ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
          <span className="sr-only">{block.isHidden ? `Show ${name}` : `Hide ${name}`}</span>
        </TooltipTrigger>
        <TooltipContent>
          {block.isHidden ? "Show to visitors" : "Hide from visitors"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
          <MoreHorizontalIcon aria-hidden />
          <span className="sr-only">More actions for {name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={onAddBelow}>
            <PlusIcon aria-hidden />
            Add section below
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onClick={() => actions.move(index, index - 1)}>
            <ArrowUpIcon aria-hidden />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={index === count - 1}
            onClick={() => actions.move(index, index + 1)}
          >
            <ArrowDownIcon aria-hidden />
            Move down
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.duplicate(block.id)}>
            <CopyIcon aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.toggleHidden(block.id)}>
            {block.isHidden ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
            {block.isHidden ? "Show to visitors" : "Hide from visitors"}
          </DropdownMenuItem>
          {shared ? (
            <DropdownMenuItem onClick={() => actions.detach(block.id)}>
              <Link2OffIcon aria-hidden />
              Detach (edit only here)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => saveForReuse(block.id)}>
              <BookmarkPlusIcon aria-hidden />
              Save for reuse…
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => actions.remove(block.id)}>
            <Trash2Icon aria-hidden />
            Delete section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
