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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getSectionDef, type SectionBlock } from "@/sections/registry";
import { saveToLibrary } from "@/server/library/actions";

import { useEditorMeta } from "./editor-meta";
import { useEditorStore } from "./store";

/** Names a section and saves it for reuse on other pages (requirement SEC-6). */
export function SaveSectionDialog({
  block,
  onOpenChange,
  beforeSave,
}: {
  block: SectionBlock | null;
  onOpenChange: (open: boolean) => void;
  /** Saves pending edits first; resolves to false when that failed. */
  beforeSave: () => Promise<boolean>;
}) {
  return (
    <Dialog open={block !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {block && (
          <Form block={block} onClose={() => onOpenChange(false)} beforeSave={beforeSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Form({
  block,
  onClose,
  beforeSave,
}: {
  block: SectionBlock;
  onClose: () => void;
  beforeSave: () => Promise<boolean>;
}) {
  const { page } = useEditorMeta();
  const store = useEditorStore();
  const def = getSectionDef(block.type);
  const heading = typeof block.data.heading === "string" ? block.data.heading.trim() : "";
  const [name, setName] = useState((heading || def?.name || "Section").slice(0, 60));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    if (!(await beforeSave())) {
      setPending(false);
      setError("Your latest changes couldn't be saved yet. Try again in a moment.");
      return;
    }
    const result = await saveToLibrary({ pageId: page.id, sectionId: block.id, name });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const current = store.getState().doc.sections.find((section) => section.id === block.id);
    store.getState().setShared(current ?? block, {
      name: name.trim(),
      revision: result.data.revision,
      pages: [{ id: page.id, title: page.title }],
    });
    toast.success(`Saved “${name.trim()}”. Add it to other pages from “Add section”.`);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Save section for reuse</DialogTitle>
        <DialogDescription>
          You&apos;ll find it under “Saved sections” when you add a section to any page. Pages that
          link to it stay in sync: edit it once, and it changes everywhere.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={Boolean(error) || undefined}>
        <FieldLabel htmlFor="library-name">Name</FieldLabel>
        <Input
          id="library-name"
          value={name}
          maxLength={60}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <FieldDescription>
            Only you see this name, e.g. “Opening hours” or “Newsletter signup”.
          </FieldDescription>
        )}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          Save section
        </Button>
      </DialogFooter>
    </form>
  );
}
