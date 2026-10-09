"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CopyIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Field, ImageValue, LinkValue, ListItem } from "@/sections/fields";
import { ICONS } from "@/sections/icon-map";
import { ICON_NAMES, type IconName } from "@/sections/icons";
import { type RichTextDoc, richTextIsEmpty, safeHref } from "@/sections/rich-text";

import { useEditorMeta } from "./editor-meta";
import { RichTextInput } from "./rich-text-input";

export type FieldChange = (value: unknown, options?: { coalesce?: boolean }) => void;

type FieldInputProps = {
  field: Field;
  value: unknown;
  onChange: FieldChange;
};

function isEmpty(field: Field, value: unknown) {
  switch (field.kind) {
    case "text":
      return !String(value ?? "").trim();
    case "richText":
      return richTextIsEmpty(value as RichTextDoc);
    case "image":
      return !(value as ImageValue)?.src;
    case "link":
      return !(value as LinkValue)?.label?.trim();
    default:
      return false;
  }
}

/** A labelled input for one section field. */
export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const missing = field.required && isEmpty(field, value);

  if (field.kind === "toggle") {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor={id}>{field.label}</Label>
          {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    );
  }

  if (field.kind === "list") {
    return <ListInput field={field} value={value as ListItem[]} onChange={onChange} />;
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="flex items-center justify-between gap-2">
        <span>{field.label}</span>
        {field.kind === "text" && <CharCount value={String(value ?? "")} max={field.max} />}
      </Label>
      <Control id={id} helpId={helpId} field={field} value={value} onChange={onChange} />
      {missing ? (
        <p id={helpId} className="text-xs text-amber-700 dark:text-amber-500">
          This is empty. Fill it in before you publish.
        </p>
      ) : (
        field.help && (
          <p id={helpId} className="text-xs text-muted-foreground">
            {field.help}
          </p>
        )
      )}
    </div>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  // Only shown when close to the limit, so it doesn't add noise.
  if (value.length < max * 0.8) return null;
  return (
    <span
      className={cn(
        "text-xs font-normal tabular-nums",
        value.length >= max ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

function Control({
  id,
  helpId,
  field,
  value,
  onChange,
}: FieldInputProps & { id: string; helpId: string }) {
  switch (field.kind) {
    case "text":
      return field.multiline ? (
        <Textarea
          id={id}
          aria-describedby={helpId}
          value={String(value ?? "")}
          maxLength={field.max}
          placeholder={field.placeholder}
          rows={3}
          onChange={(event) => onChange(event.target.value, { coalesce: true })}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={helpId}
          value={String(value ?? "")}
          maxLength={field.max}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value, { coalesce: true })}
        />
      );

    case "richText":
      return (
        <RichTextInput
          id={id}
          aria-describedby={helpId}
          value={value as RichTextDoc}
          marks={field.marks}
          blocks={field.blocks}
          onChange={(doc) => onChange(doc, { coalesce: true })}
        />
      );

    case "select":
      return (
        <div
          role="radiogroup"
          id={id}
          aria-describedby={helpId}
          className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
        >
          {field.options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              onClick={() => onChange(option.value)}
              className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {option.label}
            </button>
          ))}
        </div>
      );

    case "icon":
      return <IconPicker id={id} value={value as IconName} onChange={(icon) => onChange(icon)} />;

    case "image":
      // Keyed by src so undo/redo resets the draft text.
      return (
        <ImageInput
          key={(value as ImageValue).src}
          id={id}
          value={value as ImageValue}
          onChange={onChange}
        />
      );

    case "link":
      return <LinkInput id={id} value={value as LinkValue} onChange={onChange} />;

    default:
      return null;
  }
}

function IconPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: IconName;
  onChange: (icon: IconName) => void;
}) {
  const [open, setOpen] = useState(false);
  const Current = ICONS[value] ?? ICONS.sparkles;
  return (
    <div className="grid gap-2">
      <Button
        id={id}
        type="button"
        variant="outline"
        className="justify-between"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <Current aria-hidden />
          {value}
        </span>
        <ChevronDownIcon className={cn("transition-transform", open && "rotate-180")} aria-hidden />
      </Button>
      {open && (
        <div
          role="listbox"
          aria-label="Icons"
          className="grid grid-cols-6 gap-1 rounded-lg border p-2"
        >
          {ICON_NAMES.map((name) => {
            const Icon = ICONS[name];
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={name === value}
                title={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className="flex aspect-square items-center justify-center rounded-md hover:bg-muted aria-selected:bg-primary aria-selected:text-primary-foreground"
              >
                <Icon className="size-4" aria-hidden />
                <span className="sr-only">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ImageInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ImageValue;
  onChange: FieldChange;
}) {
  const [draft, setDraft] = useState(value.src);
  const [error, setError] = useState<string | null>(null);
  const altId = `${id}-alt`;

  function commit(src: string) {
    const trimmed = src.trim();
    if (trimmed && !/^https?:\/\/\S+$/i.test(trimmed)) {
      setError("Paste an image address that starts with https://");
      return;
    }
    setError(null);
    onChange({ ...value, src: trimmed });
  }

  return (
    <div className="grid gap-2">
      {value.src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.src}
          alt=""
          className="aspect-video w-full rounded-lg border object-cover"
        />
      )}
      <Input
        id={id}
        value={draft}
        placeholder="https://…"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => event.key === "Enter" && commit(draft)}
        aria-invalid={Boolean(error) || undefined}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Paste an image address for now. Uploading from your computer is coming soon.
        </p>
      )}
      <Label htmlFor={altId} className="text-xs">
        Describe the image (for screen readers and Google)
      </Label>
      <Input
        id={altId}
        value={value.alt}
        maxLength={200}
        placeholder="e.g. Our team at the office"
        onChange={(event) => onChange({ ...value, alt: event.target.value }, { coalesce: true })}
      />
    </div>
  );
}

function LinkInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: LinkValue;
  onChange: FieldChange;
}) {
  const { pages } = useEditorMeta();
  const listId = `${id}-pages`;
  const hrefId = `${id}-href`;
  const invalid = value.href.trim() !== "" && safeHref(value.href) === null;

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <Label htmlFor={id} className="text-xs">
        Button text
      </Label>
      <Input
        id={id}
        value={value.label}
        maxLength={60}
        onChange={(event) => onChange({ ...value, label: event.target.value }, { coalesce: true })}
      />
      <Label htmlFor={hrefId} className="text-xs">
        Goes to
      </Label>
      <Input
        id={hrefId}
        list={listId}
        value={value.href}
        placeholder="Pick a page or paste a web address"
        onChange={(event) => onChange({ ...value, href: event.target.value }, { coalesce: true })}
        aria-invalid={invalid || undefined}
      />
      <datalist id={listId}>
        {pages.map((page) => (
          <option key={page.id} value={page.path}>
            {page.title}
          </option>
        ))}
      </datalist>
      {invalid ? (
        <p className="text-xs text-destructive">
          Use a page like /about, a web address (https://…), or #section.
        </p>
      ) : (
        !value.href.trim() &&
        value.label.trim() && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Choose where this button goes.
          </p>
        )
      )}
    </div>
  );
}

function ListInput({
  field,
  value,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  value: ListItem[];
  onChange: FieldChange;
}) {
  const items = Array.isArray(value) ? value : [];
  const [openId, setOpenId] = useState<string | null>(null);

  const update = (next: ListItem[]) => onChange(next);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    update(next);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <span className="text-xs text-muted-foreground">
          {items.length} of {field.max}
        </span>
      </div>
      <ul className="grid gap-2">
        {items.map((item, index) => {
          const open = openId === item.id;
          const title =
            String(item[field.titleField] ?? "").trim() || `Untitled ${field.itemLabel}`;
          return (
            <li key={item.id} className="rounded-lg border">
              <div className="flex items-center gap-1 p-1 pl-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm font-medium"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <ChevronDownIcon
                    className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")}
                    aria-hidden
                  />
                  <span className="truncate">{title}</span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUpIcon aria-hidden />
                  <span className="sr-only">Move {title} up</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDownIcon aria-hidden />
                  <span className="sr-only">Move {title} down</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={items.length >= field.max}
                  onClick={() => {
                    const copy = { ...structuredClone(item), id: globalThis.crypto.randomUUID() };
                    update([...items.slice(0, index + 1), copy, ...items.slice(index + 1)]);
                  }}
                >
                  <CopyIcon aria-hidden />
                  <span className="sr-only">Duplicate {title}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={items.length <= field.min}
                  title={
                    items.length <= field.min
                      ? `Keep at least ${field.min} ${field.itemLabel}`
                      : undefined
                  }
                  onClick={() => update(items.filter((other) => other.id !== item.id))}
                >
                  <Trash2Icon aria-hidden />
                  <span className="sr-only">Remove {title}</span>
                </Button>
              </div>
              {open && (
                <div className="grid gap-4 border-t p-3">
                  {Object.entries(field.fields).map(([key, sub]) => (
                    <FieldInput
                      key={key}
                      field={sub}
                      value={item[key]}
                      onChange={(next, options) =>
                        onChange(
                          items.map((other) =>
                            other.id === item.id ? { ...other, [key]: next } : other,
                          ),
                          options,
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={items.length >= field.max}
        onClick={() => {
          const item = { id: globalThis.crypto.randomUUID(), ...field.newItem() } as ListItem;
          update([...items, item]);
          setOpenId(item.id);
        }}
      >
        <PlusIcon aria-hidden />
        {items.length >= field.max ? `Maximum of ${field.max} reached` : `Add ${field.itemLabel}`}
      </Button>
    </div>
  );
}
