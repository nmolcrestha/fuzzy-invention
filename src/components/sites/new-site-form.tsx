"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SubdomainField } from "@/components/sites/subdomain-field";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { suggestSubdomain } from "@/lib/slug";
import { createSite } from "@/server/sites/actions";
import { SITE_KINDS } from "@/server/sites/schemas";

type Kind = (typeof SITE_KINDS)[number]["value"];

export function NewSiteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("saas");
  const [subdomain, setSubdomain] = useState("");
  // Keep suggesting an address from the name until the user edits it themselves.
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleNameChange(value: string) {
    setName(value);
    if (!subdomainEdited) setSubdomain(value.trim() ? suggestSubdomain(value) : "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});

    const result = await createSite({ name, kind, subdomain });
    if (!result.ok) {
      setPending(false);
      setFieldErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    toast.success(`“${name}” is ready. Start by adding pages.`);
    router.push(`/dashboard/sites/${result.data.siteId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
          <FieldLabel htmlFor="name">Business or website name</FieldLabel>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="e.g. Bella Cucina"
            maxLength={80}
            required
            autoFocus
            aria-invalid={Boolean(fieldErrors.name) || undefined}
          />
          {fieldErrors.name ? (
            <FieldError>{fieldErrors.name}</FieldError>
          ) : (
            <FieldDescription>You can change this later.</FieldDescription>
          )}
        </Field>

        <FieldSet>
          <FieldLegend variant="label">What are you building?</FieldLegend>
          <RadioGroup
            value={kind}
            onValueChange={(value) => setKind(value as Kind)}
            className="grid gap-3 sm:grid-cols-2"
          >
            {SITE_KINDS.map((option) => (
              <FieldLabel
                key={option.value}
                htmlFor={`kind-${option.value}`}
                className="cursor-pointer"
              >
                <Field orientation="horizontal">
                  <div className="grid flex-1 gap-1">
                    <span className="font-medium">{option.label}</span>
                    <FieldDescription>{option.hint}</FieldDescription>
                  </div>
                  <RadioGroupItem id={`kind-${option.value}`} value={option.value} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <SubdomainField
          value={subdomain}
          onChange={(value) => {
            setSubdomainEdited(true);
            setSubdomain(value);
          }}
          serverError={fieldErrors.subdomain}
          description="This is where people will find your website. You can connect your own domain later."
        />

        <Button type="submit" size="lg" disabled={pending || !name.trim() || !subdomain}>
          {pending && <Loader2Icon className="animate-spin" aria-hidden />}
          {pending ? "Setting up your website…" : "Create website"}
        </Button>
      </FieldGroup>
    </form>
  );
}
