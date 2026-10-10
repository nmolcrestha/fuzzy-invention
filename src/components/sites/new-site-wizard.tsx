"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, FileIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SubdomainField } from "@/components/sites/subdomain-field";
import { TemplatePreview } from "@/components/sites/template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { suggestSubdomain, subdomainProblem } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { normalizeTheme, readableOn, THEME_PRESETS } from "@/sections/theme";
import { createSite } from "@/server/sites/actions";
import { SITE_KINDS } from "@/server/sites/schemas";
import { TEMPLATES } from "@/templates/definitions";
import {
  materializeBlank,
  type MaterializedSite,
  materializeTemplate,
} from "@/templates/materialize";

type Kind = (typeof SITE_KINDS)[number]["value"];
const STEPS = ["What you're building", "Your details", "Starting point", "Style"] as const;
const BLANK = "blank";

export function NewSiteWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [templateId, setTemplateId] = useState<string>(BLANK);
  const [preset, setPreset] = useState<string>("modern");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Recommended template first, then the others, then "start blank".
  const templates = useMemo(
    () => [...TEMPLATES].sort((a, b) => Number(b.kind === kind) - Number(a.kind === kind)),
    [kind],
  );

  // Live previews use the real business name and tagline. Recomputed only when they change.
  const previews = useMemo((): Record<string, MaterializedSite> => {
    const ctx = { name: name.trim() || "Your business", tagline: tagline.trim() };
    return {
      ...Object.fromEntries(
        TEMPLATES.map((template) => [template.id, materializeTemplate(template, ctx)]),
      ),
      [BLANK]: materializeBlank(ctx),
    };
  }, [name, tagline]);

  const selectedTheme = normalizeTheme({
    ...(THEME_PRESETS.find((item) => item.id === preset)?.theme ?? {}),
    preset,
  });

  function chooseKind(value: Kind) {
    setKind(value);
    const recommended = TEMPLATES.find((template) => template.kind === value);
    setTemplateId(recommended?.id ?? BLANK);
    setPreset(recommended?.preset ?? "modern");
  }

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = TEMPLATES.find((item) => item.id === id);
    if (template) setPreset(template.preset);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!subdomainEdited) setSubdomain(value.trim() ? suggestSubdomain(value) : "");
  }

  const canContinue =
    (step === 0 && kind !== null) ||
    (step === 1 &&
      name.trim().length > 0 &&
      subdomain.length > 0 &&
      !subdomainProblem(subdomain)) ||
    step >= 2;

  async function create() {
    if (!kind) return;
    setPending(true);
    setFieldErrors({});
    const result = await createSite({
      name,
      kind,
      subdomain,
      tagline,
      templateId: templateId === BLANK ? null : templateId,
      preset,
    });
    if (!result.ok) {
      setPending(false);
      setFieldErrors(result.fieldErrors ?? {});
      if (result.fieldErrors?.name || result.fieldErrors?.subdomain || result.fieldErrors?.tagline)
        setStep(1);
      toast.error(result.error);
      return;
    }
    toast.success(`“${name}” is ready. Click anything in the preview to change it.`, {
      duration: 8000,
    });
    router.push(`/editor/${result.data.siteId}/${result.data.homePageId}`);
  }

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              index === step ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs",
                index < step && "border-primary bg-primary text-primary-foreground",
                index === step && "border-primary text-primary",
              )}
            >
              {index < step ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4" aria-labelledby="step-kind">
          <h2 id="step-kind" className="text-xl font-semibold">
            What are you building?
          </h2>
          <div role="radiogroup" aria-labelledby="step-kind" className="grid gap-3 sm:grid-cols-2">
            {SITE_KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={kind === option.value}
                onClick={() => chooseKind(option.value)}
                className="rounded-xl border p-4 text-left transition-colors hover:bg-muted aria-checked:border-primary aria-checked:bg-primary/5"
              >
                <span className="block font-medium">{option.label}</span>
                <span className="block text-sm text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4" aria-labelledby="step-details">
          <h2 id="step-details" className="text-xl font-semibold">
            Tell us about it
          </h2>
          <FieldGroup>
            <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
              <FieldLabel htmlFor="name">Business or website name</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="e.g. Bella Cucina"
                maxLength={80}
                autoFocus
              />
              {fieldErrors.name ? (
                <FieldError>{fieldErrors.name}</FieldError>
              ) : (
                <FieldDescription>
                  We&apos;ll use it in your pages. You can change it later.
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={Boolean(fieldErrors.tagline) || undefined}>
              <FieldLabel htmlFor="tagline">
                What do you do, in one sentence?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Input
                id="tagline"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="e.g. Handmade pasta in the heart of Kathmandu"
                maxLength={120}
              />
              {fieldErrors.tagline ? (
                <FieldError>{fieldErrors.tagline}</FieldError>
              ) : (
                <FieldDescription>Becomes the main headline of your homepage.</FieldDescription>
              )}
            </Field>
            <SubdomainField
              value={subdomain}
              onChange={(value) => {
                setSubdomainEdited(true);
                setSubdomain(value);
              }}
              serverError={fieldErrors.subdomain}
              description="Where people will find your website. You can connect your own domain later."
            />
          </FieldGroup>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4" aria-labelledby="step-template">
          <div>
            <h2 id="step-template" className="text-xl font-semibold">
              Pick a starting point
            </h2>
            <p className="text-sm text-muted-foreground">
              Every word and picture can be changed. Pages you don&apos;t need can be deleted.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="step-template"
            className="grid gap-4 sm:grid-cols-2"
          >
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={templateId === template.id}
                onClick={() => chooseTemplate(template.id)}
                className="grid gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-2 aria-checked:ring-primary/30"
              >
                <TemplatePreview
                  site={previews[template.id]!}
                  name={name}
                  theme={normalizeTheme({
                    ...THEME_PRESETS.find((item) => item.id === template.preset)?.theme,
                    preset: template.preset,
                  })}
                  width={300}
                  height={190}
                />
                <span className="px-1">
                  <span className="flex items-center gap-2 font-medium">
                    {template.name}
                    {template.kind === kind && <Badge variant="secondary">Recommended</Badge>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {template.description}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {previews[template.id]!.pages.map((page) => page.title).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={templateId === BLANK}
              onClick={() => setTemplateId(BLANK)}
              className="grid gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-checked:border-primary aria-checked:bg-primary/5 aria-checked:ring-2 aria-checked:ring-primary/30"
            >
              <span className="flex h-[190px] w-[300px] max-w-full items-center justify-center rounded-md border border-dashed bg-muted/40">
                <FileIcon className="size-8 text-muted-foreground" aria-hidden />
              </span>
              <span className="px-1">
                <span className="block font-medium">Start blank</span>
                <span className="block text-sm text-muted-foreground">
                  Just a homepage with a headline. Add sections yourself.
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4" aria-labelledby="step-style">
          <div>
            <h2 id="step-style" className="text-xl font-semibold">
              Pick a style
            </h2>
            <p className="text-sm text-muted-foreground">
              Colors and fonts. You can fine-tune them any time in the Design tab.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div
              role="radiogroup"
              aria-labelledby="step-style"
              className="grid h-fit grid-cols-2 gap-2"
            >
              {THEME_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={preset === item.id}
                  onClick={() => setPreset(item.id)}
                  className="flex items-center gap-2 rounded-lg border p-2 text-left text-sm hover:bg-muted aria-checked:border-primary aria-checked:bg-primary/5"
                >
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: item.theme.primary,
                      color: readableOn(item.theme.primary),
                    }}
                  >
                    {preset === item.id ? <CheckIcon className="size-4" /> : "Aa"}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden sm:block">
              <TemplatePreview
                site={previews[templateId]!}
                name={name}
                theme={selectedTheme}
                width={420}
                height={300}
              />
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 border-t pt-6">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
            <ArrowLeftIcon aria-hidden />
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canContinue}>
            Continue
            <ArrowRightIcon aria-hidden />
          </Button>
        ) : (
          <Button size="lg" onClick={create} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {pending ? "Building your website…" : "Create my website"}
          </Button>
        )}
      </div>
    </div>
  );
}
