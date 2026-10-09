"use client";

import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { rootDomain } from "@/lib/site-url";
import { subdomainProblem } from "@/lib/slug";
import { checkSubdomain } from "@/server/sites/actions";

type Check =
  { state: "idle" } | { state: "checking" } | { state: "ok" } | { state: "error"; message: string };

/**
 * Web address input with a live availability check.
 * `serverError` shows errors returned when the form was submitted.
 */
export function SubdomainField({
  value,
  onChange,
  exceptSiteId,
  serverError,
  description,
}: {
  value: string;
  onChange: (value: string) => void;
  exceptSiteId?: string;
  serverError?: string;
  description?: React.ReactNode;
}) {
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const localProblem = value ? subdomainProblem(value) : null;

  useEffect(() => {
    if (!value || localProblem) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheck({ state: "checking" });
      const result = await checkSubdomain(value, exceptSiteId);
      if (cancelled) return;
      setCheck(
        result.available
          ? { state: "ok" }
          : { state: "error", message: result.message ?? "Not available." },
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, localProblem, exceptSiteId]);

  const error = localProblem ?? (check.state === "error" ? check.message : null) ?? serverError;

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor="subdomain">Web address</FieldLabel>
      <div className="flex items-center rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
        <Input
          id="subdomain"
          name="subdomain"
          value={value}
          onChange={(event) => {
            setCheck({ state: "idle" });
            onChange(event.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error) || undefined}
          className="border-0 shadow-none focus-visible:ring-0"
          required
        />
        <span className="shrink-0 pr-3 text-sm text-muted-foreground">.{rootDomain}</span>
      </div>
      {error ? (
        <FieldError className="flex items-center gap-1.5">
          <XCircleIcon className="size-4 shrink-0" aria-hidden />
          {error}
        </FieldError>
      ) : check.state === "checking" ? (
        <FieldDescription className="flex items-center gap-1.5">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Checking if it&apos;s available…
        </FieldDescription>
      ) : check.state === "ok" && value ? (
        <FieldDescription className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
          <CheckCircle2Icon className="size-4" aria-hidden />
          {value}.{rootDomain} is available
        </FieldDescription>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}
