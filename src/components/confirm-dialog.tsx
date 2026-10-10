"use client";

import { Loader2Icon } from "lucide-react";
import { type ReactElement, type ReactNode, useId, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmDialogProps = {
  /** Element that opens the dialog, e.g. `<Button>Delete site</Button>`. */
  trigger: ReactElement;
  title: string;
  description: string;
  /** Plain-language list of what will happen. Shown as bullet points. */
  consequences?: string[];
  /** Say what the button does ("Delete Bella Cucina forever"), never just "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  /** When set, the user must type this text exactly before confirming (for irreversible actions). */
  confirmText?: string;
  /** Extra options shown above the buttons (e.g. a checkbox). */
  children?: ReactNode;
  onConfirm: () => Promise<void> | void;
};

/**
 * Confirmation for public, irreversible or high-impact actions (requirement §8.2).
 * Reversible actions should use an undo toast instead.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  confirmText,
  children,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const inputId = useId();

  const canConfirm = !pending && (!confirmText || typed === confirmText);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setError(null);
    }
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
      setTyped("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {consequences && consequences.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {confirmText && (
          <div className="grid gap-2">
            <Label htmlFor={inputId} className="text-sm font-normal">
              Type <span className="font-semibold">{confirmText}</span> to confirm
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </div>
        )}

        {children}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
