"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { siteHost } from "@/lib/site-url";
import { normalizePath, pathFromTitle } from "@/lib/slug";
import { createPage, updatePage } from "@/server/pages/actions";

type EditablePage = {
  id: string;
  title: string;
  path: string;
  isHome: boolean;
  publishedAt: Date | null;
};

type PageFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  subdomain: string;
  /** Omit to create a new page. */
  page?: EditablePage;
};

export function PageFormDialog(props: PageFormDialogProps) {
  // Remount the form each time the dialog opens so it starts from fresh values.
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">{props.open && <PageForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function PageForm({ onOpenChange, siteId, subdomain, page }: PageFormDialogProps) {
  const editing = Boolean(page);
  const [title, setTitle] = useState(page?.title ?? "");
  const [path, setPath] = useState(page?.path ?? "");
  const [pathEdited, setPathEdited] = useState(editing);
  const [showInNav, setShowInNav] = useState(true);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const effectivePath = pathEdited ? normalizePath(path) : title.trim() ? pathFromTitle(title) : "";
  const pathChanged = editing && page!.path !== effectivePath;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});

    const result = editing
      ? await updatePage({ pageId: page!.id, title, path: effectivePath })
      : await createPage({ siteId, title, path: pathEdited ? path : "", showInNav });

    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    if (editing) {
      toast.success(pathChanged ? `Saved. The page now lives at ${effectivePath}.` : "Page saved.");
    } else if (result.data && "page" in result.data) {
      const created = result.data.page;
      toast.success(
        `Added “${created.title}” at ${created.path}${created.showInNav ? " and to your menu" : ""}.`,
      );
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Page details" : "Add a page"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Change the page's name or web address."
            : "Give it a name. You'll add content to it in the editor."}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors.title) || undefined}>
          <FieldLabel htmlFor="page-title">Page name</FieldLabel>
          <Input
            id="page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. About us"
            maxLength={80}
            required
            autoFocus
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
              This page is already published. Links people saved to {page.path} will stop working.
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
