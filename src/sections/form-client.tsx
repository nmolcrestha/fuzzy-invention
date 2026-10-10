"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { type FormFieldItem, HONEYPOT, inputName } from "./form";

type Result = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

const INPUT_TYPES = { text: "text", email: "email", phone: "tel" } as const;

function autoComplete(field: FormFieldItem) {
  if (field.kind === "email") return "email";
  if (field.kind === "phone") return "tel";
  if (/name/i.test(field.label)) return "name";
  return undefined;
}

/**
 * The form itself. Without JavaScript it's a normal form post; the submit route then redirects
 * back to the matching "#sq-sent-…" / "#sq-failed-…" message, which CSS reveals with :target.
 */
export function ContactFormClient({
  sectionId,
  fields,
  submitLabel,
  successMessage,
  live,
}: {
  sectionId: string;
  fields: FormFieldItem[];
  submitLabel: string;
  successMessage: string;
  /** False in the editor preview, where messages can't be sent yet. */
  live: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previewNote = () =>
    setError("This is a preview. Publish the page to start receiving messages.");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) return previewNote();
    setStatus("sending");
    setError(null);
    setErrors({});
    const body = new FormData(event.currentTarget);
    body.set("_page", window.location.pathname);
    try {
      const response = await fetch("/_form", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const result = (await response.json()) as Result;
      if (result.ok) {
        setStatus("sent");
        return;
      }
      setErrors(result.errors ?? {});
      setError(result.error);
    } catch {
      setError("Your message couldn't be sent. Check your connection and try again.");
    }
    setStatus("idle");
  }

  if (status === "sent") {
    return (
      <p role="status" className="sq-form-message">
        {successMessage}
      </p>
    );
  }

  return (
    <>
      <form
        action="/_form"
        method="post"
        onSubmit={handleSubmit}
        className="grid gap-5"
        aria-describedby={error ? `${sectionId}-error` : undefined}
      >
        <input type="hidden" name="_section" value={sectionId} />
        {/* Only bots fill this in. */}
        <div className="sq-hp" aria-hidden>
          <label>
            Website
            <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {fields.map((field) => {
          const name = inputName(field);
          const id = `${sectionId}-${field.id}`;
          const fieldError = errors[name];
          const common = {
            id,
            name,
            required: field.required,
            autoComplete: autoComplete(field),
            "aria-invalid": fieldError ? true : undefined,
            "aria-describedby": fieldError ? `${id}-error` : undefined,
            className: "sq-input",
          };
          return (
            <div key={field.id} className="grid gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {field.label}
                {!field.required && (
                  <span className="font-normal text-sq-muted-fg"> (optional)</span>
                )}
              </label>
              {field.kind === "message" ? (
                <textarea {...common} rows={5} maxLength={5000} />
              ) : (
                <input {...common} type={INPUT_TYPES[field.kind]} maxLength={200} />
              )}
              {fieldError && (
                <p id={`${id}-error`} className="text-sm text-sq-danger">
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}

        {error && (
          <p id={`${sectionId}-error`} role="alert" className="text-sm text-sq-danger">
            {error}
          </p>
        )}
        <div>
          <button
            // In previews, skip the browser's required-field check and just explain.
            type={live ? "submit" : "button"}
            onClick={live ? undefined : previewNote}
            className={cn("sq-btn sq-btn-primary", status === "sending" && "opacity-70")}
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : submitLabel || "Send"}
          </button>
        </div>
      </form>
      {/* Shown after a form post without JavaScript. */}
      <p id={`sq-sent-${sectionId}`} role="status" className="sq-form-message sq-form-sent">
        {successMessage}
      </p>
      <p id={`sq-failed-${sectionId}`} role="alert" className="sq-form-failed text-sq-danger">
        Your message couldn&apos;t be sent. Check the fields and try again.
      </p>
    </>
  );
}
