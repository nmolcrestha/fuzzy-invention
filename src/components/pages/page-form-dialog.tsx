"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImagePickerField } from "@/components/media/image-picker-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PageSeo } from "@/db/schema";
import { siteHost } from "@/lib/site-url";
import { normalizePath, pathFromTitle } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { SEO_DESCRIPTION_LIMIT, SEO_TITLE_LIMIT, seoTitle } from "@/sections/seo";
import { createPage, updatePage } from "@/server/pages/actions";

export type EditablePage = {
  id: string;
  title: string;
  path: string;
  isHome: boolean;
  publishedAt: Date | null;
  seo: PageSeo;
};

type PageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName: string;
  subdomain: string;
  /** Omit to create a new page. */
  page?: EditablePage;
  /** Which part of the page details to show first. */
  initialTab?: "page" | "seo";
  /** Called after a successful save. */
  onSaved?: () => void;
};

export function PageFormDialog(props: PageFormDialogProps) {
  // Remount the form each time the dialog opens so it starts from fresh values.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {props.open && <PageForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function PageForm({
  onOpenChange,
  siteId,
  siteName,
  subdomain,
  page,
  initialTab = "page",
  onSaved,
}: PageFormDialogProps) {
  const editing = Boolean(page);
  const [tab, setTab] = useState<"page" | "seo">(editing ? initialTab : "page");
  const [title, setTitle] = useState(page?.title ?? "");
  const [path, setPath] = useState(page?.path ?? "");
  const [pathEdited, setPathEdited] = useState(editing);
  const [showInNav, setShowInNav] = useState(true);
  const [seo, setSeo] = useState({
    title: page?.seo.title ?? "",
    description: page?.seo.description ?? "",
    image: page?.seo.image ?? "",
    noindex: Boolean(page?.seo.noindex),
  });
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const effectivePath = pathEdited ? normalizePath(path) : title.trim() ? pathFromTitle(title) : "";
  const pathChanged = editing && page!.path !== effectivePath;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});

    const result = editing
      ? await updatePage({ pageId: page!.id, title, path: effectivePath, seo })
      : await createPage({ siteId, title, path: pathEdited ? path : "", showInNav });

    setPending(false);
    if (!result.ok) {
      const errors = result.fieldErrors ?? {};
      setFieldErrors(errors);
      if (Object.keys(errors).some((key) => key.startsWith("seo."))) setTab("seo");
      else if (errors.title || errors.path) setTab("page");
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    if (editing) {
      toast.success(
        pathChanged
          ? `Saved. The page will live at ${effectivePath} once you publish it.`
          : page!.publishedAt
            ? "Saved. Publish the page to show the changes on your website."
            : "Page saved.",
      );
    } else if (result.data && "page" in result.data) {
      const created = result.data.page;
      toast.success(
        `Added “${created.title}” at ${created.path}${created.showInNav ? " and to your menu" : ""}.`,
      );
    }
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Page settings" : "Add a page"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change the page's name, web address, and how it looks in Google and on social media."
            : "Give it a name. You'll add content to it in the editor."}
        </DialogDescription>
      </DialogHeader>

      {editing && (
        <div
          role="tablist"
          aria-label="Page settings"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {(
            [
              ["page", "Name & address"],
              ["seo", "Search & social"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <FieldGroup className={cn(tab !== "page" && "hidden")}>
        <Field data-invalid={Boolean(fieldErrors.title) || undefined}>
          <FieldLabel htmlFor="page-title">Page name</FieldLabel>
          <Input
            id="page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. About us"
            maxLength={80}
            required
            autoFocus={tab === "page"}
          />
          {fieldErrors.title ? (
            <FieldError>{fieldErrors.title}</FieldError>
          ) : (
            <FieldDescription>Shown in your menu and browser tab.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={Boolean(fieldErrors.path) || undefined}>
          <FieldLabel htmlFor="page-path">Page address</FieldLabel>
          <Input
            id="page-path"
            value={pathEdited ? path : effectivePath}
            onChange={(event) => {
              setPathEdited(true);
              setPath(event.target.value);
            }}
            placeholder="/about-us"
            disabled={page?.isHome}
            spellCheck={false}
          />
          {fieldErrors.path ? (
            <FieldError>{fieldErrors.path}</FieldError>
          ) : page?.isHome ? (
            <FieldDescription>The homepage always lives at the main address.</FieldDescription>
          ) : (
            <FieldDescription className="break-all">
              {siteHost(subdomain)}
              {effectivePath || "/…"}
            </FieldDescription>
          )}
          {pathChanged && page?.publishedAt && (
            <p className="text-sm text-amber-700 dark:text-amber-500">
              This page is live at {page.path}. When you publish the new address, you can forward
              visitors from {page.path} so saved links keep working.
            </p>
          )}
        </Field>

        {!editing && (
          <Field orientation="horizontal">
            <Switch id="page-nav" checked={showInNav} onCheckedChange={setShowInNav} />
            <FieldLabel htmlFor="page-nav" className="font-normal">
              Show in the website menu
            </FieldLabel>
          </Field>
        )}
      </FieldGroup>

      {editing && (
        <div className={cn("grid gap-5", tab !== "seo" && "hidden")}>
          <SearchPreview
            host={siteHost(subdomain)}
            path={effectivePath}
            title={seoTitle({ title, isHome: page!.isHome, seo }, siteName)}
            description={seo.description}
          />

          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors["seo.title"]) || undefined}>
              <FieldLabel htmlFor="seo-title" className="flex justify-between">
                <span>Title in search results</span>
                <Counter value={seo.title} limit={SEO_TITLE_LIMIT} />
              </FieldLabel>
              <Input
                id="seo-title"
                value={seo.title}
                maxLength={70}
                placeholder={seoTitle({ title, isHome: page!.isHome, seo: {} }, siteName)}
                onChange={(event) => setSeo({ ...seo, title: event.target.value })}
              />
              {fieldErrors["seo.title"] ? (
                <FieldError>{fieldErrors["seo.title"]}</FieldError>
              ) : (
                <FieldDescription>
                  Leave empty to use the page name. Keep it under {SEO_TITLE_LIMIT} characters.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors["seo.description"]) || undefined}>
              <FieldLabel htmlFor="seo-description" className="flex justify-between">
                <span>Description</span>
                <Counter value={seo.description} limit={SEO_DESCRIPTION_LIMIT} />
              </FieldLabel>
              <Textarea
                id="seo-description"
                value={seo.description}
                maxLength={300}
                rows={3}
                placeholder="A sentence or two about what people will find on this page."
                onChange={(event) => setSeo({ ...seo, description: event.target.value })}
              />
              {fieldErrors["seo.description"] ? (
                <FieldError>{fieldErrors["seo.description"]}</FieldError>
              ) : (
                <FieldDescription>
                  Shown under the title in Google. Leave empty to use the first text on the page.
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="seo-image">Social media image</FieldLabel>
              <ImagePickerField
                id="seo-image"
                label="Social media image"
                siteId={siteId}
                withAlt={false}
                pickerTitle="Choose a social media image"
                previewClassName="aspect-[1.91/1]"
                value={{ src: seo.image, alt: "" }}
                onChange={(image) => setSeo({ ...seo, image: image.src })}
              />
              <FieldDescription>
                Shown when someone shares this page on Facebook, LinkedIn or in a chat. A wide image
                (1200 × 630) works best.
              </FieldDescription>
            </Field>

            <Field orientation="horizontal" className="items-start">
              <Switch
                id="seo-noindex"
                checked={seo.noindex}
                onCheckedChange={(noindex) => setSeo({ ...seo, noindex })}
              />
              <div className="grid gap-1">
                <FieldLabel htmlFor="seo-noindex" className="font-normal">
                  Hide this page from search engines
                </FieldLabel>
                <FieldDescription>
                  Google won&apos;t list it. People with the link can still visit it.
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {editing ? "Save changes" : "Add page"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Counter({ value, limit }: { value: string; limit: number }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "text-xs font-normal tabular-nums",
        value.length > limit ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground",
      )}
    >
      {value.length}/{limit}
    </span>
  );
}

/** Roughly how the page appears in Google. */
function SearchPreview({
  host,
  path,
  title,
  description,
}: {
  host: string;
  path: string;
  title: string;
  description: string;
}) {
  const cut = (text: string, limit: number) =>
    text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
  return (
    <figure className="grid gap-1 rounded-lg border bg-card p-4">
      <figcaption className="mb-1 text-xs font-medium text-muted-foreground">
        Preview in Google
      </figcaption>
      <p className="truncate text-xs text-muted-foreground">
        {host}
        {path === "/" ? "" : path.replaceAll("/", " › ")}
      </p>
      <p className="text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
        {cut(title, SEO_TITLE_LIMIT)}
      </p>
      <p className="text-sm text-muted-foreground">
        {description.trim() ? (
          cut(description.trim(), SEO_DESCRIPTION_LIMIT)
        ) : (
          <span className="italic">Google will use the first text on your page.</span>
        )}
      </p>
    </figure>
  );
}
