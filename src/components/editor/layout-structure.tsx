"use client";

import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
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
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownIcon,
  ArrowRightLeftIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  Columns3Icon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ITEM_DEFS, ITEM_KINDS, type ItemKind } from "@/sections/items";
import {
  type Align,
  type ColumnBackground,
  type CustomLayout,
  LIMITS,
  type LayoutColumn,
  type LayoutItem,
  SPLITS,
  type SplitId,
} from "@/sections/layout";
import { findColumn, findItem, type ItemAt, layoutOps } from "@/sections/layout-ops";
import { PRESETS } from "@/sections/presets";
import type { SectionBlock } from "@/sections/registry";

import { ops } from "./doc-ops";
import { itemSummary } from "./item-summary";
import { useEditor, useEditorStore } from "./store";

const ROW = "row:";
const COLUMN = "col:";

const ALIGNS: { value: Align; label: string; icon: typeof AlignLeftIcon }[] = [
  { value: "start", label: "Left", icon: AlignLeftIcon },
  { value: "center", label: "Center", icon: AlignCenterIcon },
  { value: "end", label: "Right", icon: AlignRightIcon },
];
const VALIGNS: { value: Align; label: string }[] = [
  { value: "start", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "end", label: "Bottom" },
];
const COLUMN_BACKGROUNDS: { value: ColumnBackground; label: string }[] = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "brand", label: "Brand" },
  { value: "card", label: "Card" },
];

/** Rows drag among rows; items drag among items and into (empty) columns. */
const collisionDetection: CollisionDetection = (args) => {
  const draggingRow = String(args.active.id).startsWith(ROW);
  const droppableContainers = args.droppableContainers.filter(
    (container) => String(container.id).startsWith(ROW) === draggingRow,
  );
  const hits = pointerWithin({ ...args, droppableContainers });
  if (hits.length > 0) {
    // Prefer the item under the pointer over the column around it.
    return [hits.find((hit) => !String(hit.id).startsWith(COLUMN)) ?? hits[0]!];
  }
  return closestCenter({ ...args, droppableContainers });
};

/** "Customize layout" (requirements SB-20 to SB-26, SB-50, SB-51). */
export function LayoutStructure({ block }: { block: SectionBlock }) {
  const store = useEditorStore();
  const change = useEditor((state) => state.change);
  const layout = block.data.layout as CustomLayout;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const apply = (fn: (layout: CustomLayout) => CustomLayout) =>
    change((doc) => {
      const current = (doc.sections.find((section) => section.id === block.id)?.data.layout ??
        layout) as CustomLayout;
      const next = fn(current);
      return next === current ? doc : ops.setField(doc, block.id, ["layout"], next);
    });

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId.startsWith(ROW)) {
      const from = layout.rows.findIndex((row) => ROW + row.id === activeId);
      const to = layout.rows.findIndex((row) => ROW + row.id === overId);
      apply((current) => layoutOps.moveRow(current, from, to));
      return;
    }
    const from = findItem(layout, activeId);
    if (!from) return;
    let to: ItemAt | null = null;
    if (overId.startsWith(COLUMN)) {
      const column = findColumn(layout, overId.slice(COLUMN.length));
      if (column) {
        to = { ...column, item: layout.rows[column.row]!.columns[column.column]!.items.length };
      }
    } else {
      to = findItem(layout, overId);
    }
    if (to) apply((current) => layoutOps.moveItem(current, from, to));
  }

  const preset = PRESETS[layout.preset];
  const reset = () => {
    apply((current) => layoutOps.resetToPreset(current));
    toast(`Back to the “${preset?.name}” design. Your content is kept.`, {
      duration: 8000,
      action: { label: "Undo", onClick: () => store.getState().undo() },
    });
  };

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Drag items to reorder them or move them to another column. Columns stack on phones.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layout.rows.map((row) => ROW + row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="grid gap-3" aria-label="Rows">
            {layout.rows.map((row, rowIndex) => (
              <SortableRow key={row.id} layout={layout} rowIndex={rowIndex} apply={apply} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={layout.rows.length >= LIMITS.rows}
              title={
                layout.rows.length >= LIMITS.rows
                  ? `A section can have up to ${LIMITS.rows} rows.`
                  : undefined
              }
            />
          }
        >
          <PlusIcon aria-hidden />
          {layout.rows.length >= LIMITS.rows ? `Maximum of ${LIMITS.rows} rows` : "Add row"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>New row with…</DropdownMenuLabel>
            {SPLITS.map((split) => (
              <DropdownMenuItem
                key={split.id}
                onClick={() => apply((current) => layoutOps.addRow(current, split.id))}
              >
                <SplitIcon split={split.id} />
                {split.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {preset && (
        <Button variant="ghost" size="sm" className="justify-start" onClick={reset}>
          <RotateCcwIcon aria-hidden />
          Reset to the starting design
        </Button>
      )}
    </div>
  );
}

/** A tiny drawing of a column split. */
function SplitIcon({ split }: { split: SplitId }) {
  const widths: Record<SplitId, number[]> = {
    "1": [1],
    "1/2+1/2": [1, 1],
    "2/3+1/3": [2, 1],
    "1/3+2/3": [1, 2],
    "1/3x3": [1, 1, 1],
    "1/4x4": [1, 1, 1, 1],
  };
  return (
    <span aria-hidden className="flex h-3.5 w-6 gap-0.5">
      {widths[split].map((width, index) => (
        <span
          key={index}
          className="rounded-[2px] bg-current opacity-60"
          style={{ flexGrow: width }}
        />
      ))}
    </span>
  );
}

type Apply = (fn: (layout: CustomLayout) => CustomLayout) => void;

function SortableRow({
  layout,
  rowIndex,
  apply,
}: {
  layout: CustomLayout;
  rowIndex: number;
  apply: Apply;
}) {
  const row = layout.rows[rowIndex]!;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ROW + row.id });
  const split = SPLITS.find((option) => option.id === row.split)!;
  const label = `Row ${rowIndex + 1}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-lg border bg-background", isDragging && "relative z-10 shadow-lg")}
    >
      <div className="flex items-center gap-1 border-b bg-muted/40 p-1 pl-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Drag to reorder ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </button>
        <span className="flex-1 text-xs font-semibold">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
            <SplitIcon split={row.split} />
            <span className="sr-only">Columns in {label}: </span>
            {split.label}
            <ChevronDownIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={row.split}
                onValueChange={(value) =>
                  apply((current) => layoutOps.setSplit(current, rowIndex, value as SplitId))
                }
              >
                {SPLITS.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id} closeOnClick>
                    <SplitIcon split={option.id} />
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
            <MoreHorizontalIcon aria-hidden />
            <span className="sr-only">More actions for {label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              disabled={rowIndex === 0}
              onClick={() => apply((current) => layoutOps.moveRow(current, rowIndex, rowIndex - 1))}
            >
              <ArrowUpIcon aria-hidden />
              Move row up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={rowIndex === layout.rows.length - 1}
              onClick={() => apply((current) => layoutOps.moveRow(current, rowIndex, rowIndex + 1))}
            >
              <ArrowDownIcon aria-hidden />
              Move row down
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={layout.rows.length >= LIMITS.rows}
              onClick={() => apply((current) => layoutOps.duplicateRow(current, rowIndex))}
            >
              <CopyIcon aria-hidden />
              Duplicate row
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={layout.rows.length <= 1}
              onClick={() => apply((current) => layoutOps.removeRow(current, rowIndex))}
            >
              <Trash2Icon aria-hidden />
              Delete row
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid gap-2 p-2">
        {row.columns.map((column, columnIndex) => (
          <ColumnBox
            key={column.id}
            layout={layout}
            rowIndex={rowIndex}
            columnIndex={columnIndex}
            column={column}
            apply={apply}
          />
        ))}
      </div>
    </li>
  );
}

function ColumnBox({
  layout,
  rowIndex,
  columnIndex,
  column,
  apply,
}: {
  layout: CustomLayout;
  rowIndex: number;
  columnIndex: number;
  column: LayoutColumn;
  apply: Apply;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: COLUMN + column.id });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const row = layout.rows[rowIndex]!;
  const multi = row.columns.length > 1;
  const label = multi ? `Column ${columnIndex + 1}` : "Content";
  const where = `${multi ? `column ${columnIndex + 1}` : "the row"} of row ${rowIndex + 1}`;
  const full = column.items.length >= LIMITS.items;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid gap-1.5 rounded-md border border-dashed p-1.5",
        isOver && "border-primary bg-primary/5",
      )}
      aria-label={`${label}, row ${rowIndex + 1}`}
      role="group"
    >
      <div className="flex items-center gap-1 px-1">
        <span className="flex-1 text-xs text-muted-foreground">
          {label}
          {column.mobile.hidden && " · hidden on phones"}
          {column.mobile.first && " · first on phones"}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <SlidersHorizontalIcon aria-hidden />
          <span className="sr-only">
            Settings for {label.toLowerCase()} in row {rowIndex + 1}
          </span>
        </Button>
      </div>

      {settingsOpen && (
        <ColumnSettings
          column={column}
          multi={multi}
          onChange={(patch) =>
            apply((current) => layoutOps.setColumn(current, rowIndex, columnIndex, patch))
          }
        />
      )}

      <SortableContext
        items={column.items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="grid gap-1" aria-label={`Items in ${where}`}>
          {column.items.map((item, itemIndex) => (
            <SortableItem
              key={item.id}
              item={item}
              at={{ row: rowIndex, column: columnIndex, item: itemIndex }}
              layout={layout}
              apply={apply}
            />
          ))}
        </ul>
      </SortableContext>
      {column.items.length === 0 && (
        <p className="px-1 py-2 text-center text-xs text-muted-foreground">
          Empty. Drag an item here or add one.
        </p>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="xs" className="justify-start" disabled={full} />}
        >
          <PlusIcon aria-hidden />
          {full ? `Maximum of ${LIMITS.items} items` : "Add item"}
          <span className="sr-only"> to {where}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Add to {where}</DropdownMenuLabel>
            {ITEM_KINDS.map((kind) => (
              <DropdownMenuItem
                key={kind}
                onClick={() =>
                  apply(
                    (current) =>
                      layoutOps.addItem(current, rowIndex, columnIndex, kind as ItemKind)[0],
                  )
                }
                className="items-start"
              >
                <span className="grid gap-0.5">
                  <span className="font-medium">{ITEM_DEFS[kind].name}</span>
                  <span className="text-xs text-muted-foreground">
                    {ITEM_DEFS[kind].description}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ColumnSettings({
  column,
  multi,
  onChange,
}: {
  column: LayoutColumn;
  multi: boolean;
  onChange: (patch: Partial<LayoutColumn>) => void;
}) {
  const segment =
    "flex-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm";
  return (
    <div className="grid gap-3 rounded-md bg-muted/40 p-2">
      <div className="grid gap-1">
        <span className="text-xs font-medium">Align content</span>
        <div
          role="radiogroup"
          aria-label="Align content"
          className="flex gap-1 rounded-md bg-muted p-0.5"
        >
          {ALIGNS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={column.align === option.value}
              onClick={() => onChange({ align: option.value })}
              className={segment}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {multi && (
        <div className="grid gap-1">
          <span className="text-xs font-medium">Position in the row</span>
          <div
            role="radiogroup"
            aria-label="Position in the row"
            className="flex gap-1 rounded-md bg-muted p-0.5"
          >
            {VALIGNS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={column.valign === option.value}
                onClick={() => onChange({ valign: option.value })}
                className={segment}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-1">
        <span className="text-xs font-medium">Column background</span>
        <div
          role="radiogroup"
          aria-label="Column background"
          className="flex gap-1 rounded-md bg-muted p-0.5"
        >
          {COLUMN_BACKGROUNDS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={column.background === option.value}
              onClick={() => onChange({ background: option.value })}
              className={segment}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {multi && (
        <div className="grid gap-2">
          <span className="text-xs font-medium">On phones</span>
          <PhoneSwitch
            label="Hide on phones"
            checked={column.mobile.hidden}
            onChange={(hidden) => onChange({ mobile: { ...column.mobile, hidden } })}
          />
          <PhoneSwitch
            label="Show first on phones"
            checked={column.mobile.first}
            onChange={(first) => onChange({ mobile: { ...column.mobile, first } })}
          />
        </div>
      )}
    </div>
  );
}

function PhoneSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SortableItem({
  item,
  at,
  layout,
  apply,
}: {
  item: LayoutItem;
  at: ItemAt;
  layout: CustomLayout;
  apply: Apply;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const def = ITEM_DEFS[item.kind];
  const column = layout.rows[at.row]!.columns[at.column]!;
  const targets = layout.rows.flatMap((row, rowIndex) =>
    row.columns.flatMap((other, columnIndex) =>
      rowIndex === at.row && columnIndex === at.column
        ? []
        : [
            {
              key: other.id,
              label:
                row.columns.length > 1
                  ? `Row ${rowIndex + 1}, column ${columnIndex + 1}`
                  : `Row ${rowIndex + 1}`,
              to: { row: rowIndex, column: columnIndex, item: other.items.length },
              full: other.items.length >= LIMITS.items,
            },
          ],
    ),
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-md border bg-background p-1 pr-1.5",
        isDragging && "relative z-10 shadow-lg",
        item.isHidden && "opacity-60",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Drag to move ${def.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" aria-hidden />
      </button>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium">
          {def.name}
          {item.isHidden && (
            <EyeOffIcon className="size-3.5 text-muted-foreground" aria-label="Hidden" />
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{itemSummary(item)}</span>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
          <MoreHorizontalIcon aria-hidden />
          <span className="sr-only">More actions for {def.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem
            disabled={at.item === 0}
            onClick={() =>
              apply((current) => layoutOps.moveItem(current, at, { ...at, item: at.item - 1 }))
            }
          >
            <ArrowUpIcon aria-hidden />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={at.item === column.items.length - 1}
            onClick={() =>
              apply((current) => layoutOps.moveItem(current, at, { ...at, item: at.item + 1 }))
            }
          >
            <ArrowDownIcon aria-hidden />
            Move down
          </DropdownMenuItem>
          {targets.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeftIcon aria-hidden />
                Move to…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {targets.map((target) => (
                  <DropdownMenuItem
                    key={target.key}
                    disabled={target.full}
                    onClick={() => apply((current) => layoutOps.moveItem(current, at, target.to))}
                  >
                    <Columns3Icon aria-hidden />
                    {target.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlignCenterIcon aria-hidden />
              Align
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={item.align ?? "column"}
                onValueChange={(value) =>
                  apply((current) =>
                    layoutOps.setItemAlign(
                      current,
                      at,
                      value === "column" ? undefined : (value as Align),
                    ),
                  )
                }
              >
                <DropdownMenuRadioItem value="column" closeOnClick>
                  Like the column
                </DropdownMenuRadioItem>
                {ALIGNS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
                    <option.icon aria-hidden />
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => apply((current) => layoutOps.toggleItemHidden(current, at))}
          >
            {item.isHidden ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
            {item.isHidden ? "Show to visitors" : "Hide from visitors"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={column.items.length >= LIMITS.items}
            onClick={() => apply((current) => layoutOps.duplicateItem(current, at)[0])}
          >
            <CopyIcon aria-hidden />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              apply((current) => layoutOps.removeItem(current, at));
              toast(`Deleted the ${def.name.toLowerCase()}.`, { id: `item-${item.id}` });
            }}
          >
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
