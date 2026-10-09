"use client";

import { ArrowRightIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_EXTRA_LINKS, SOCIAL_NETWORKS, type SiteNavigation } from "@/sections/navigation";
import { updateNavigation } from "@/server/sites/design-actions";

type Values = { links: SiteNavigation["links"]; social: Record<string, string> };

export function MenuEditor({
  siteId,
  initial,
  menuPages,
}: {
  siteId: string;
  initial: SiteNavigation;
  menuPages: { id: string; title: string; isLive: boolean }[];
}) {
  const start: Values = {
    links: initial.links,
    social: Object.fromEntries(
      SOCIAL_NETWORKS.map((network) => [network.id, initial.social[network.id] ?? ""]),
    ),
  };
  const [values, setValues] = useState(start);
  const [saved, setSaved] = useState(start);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const baseId = useId();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const setLink = (index: number, patch: Partial<Values["links"][number]>) =>
    setValues((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));

  async function save() {
    setPending(true);
    setErrors({});
    const result = await updateNavigation(siteId, values);
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    const cleaned = { ...values, links: values.links.filter((link) => link.label || link.href) };
    setValues(cleaned);
    setSaved(cleaned);
    toast.success("Saved. Publish the site design to update your live menu.");
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Menu</CardTitle>
          <CardDescription>Shown in your header and footer on every page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Pages in the menu</p>
            {menuPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages are in the menu yet.</p>
            ) : (
              <ol className="flex flex-wrap items-center gap-2">
                {menuPages.map((page) => (
                  <li key={page.id}>
                    <Badge variant="outline" className="gap-1.5 py-1">
                      {page.title}
                      {!page.isLive && (
                        <span className="text-muted-foreground">(not published)</span>
                      )}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-sm text-muted-foreground">
              Change the order or hide pages on the{" "}
              <Link
                href={`/dashboard/sites/${siteId}`}
                className="inline-flex items-center gap-0.5 underline underline-offset-4"
              >
                Pages tab <ArrowRightIcon className="size-3" aria-hidden />
              </Link>
              . Pages that aren&apos;t published won&apos;t appear in the live menu.
            </p>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Extra links</legend>
            <p className="-mt-2 text-sm text-muted-foreground">
              Add links to other websites, like a booking page or an online shop. They appear after
              your pages.
            </p>
            {values.links.map((link, index) => (
              <div
                key={link.id}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start"
              >
                <div className="grid gap-1">
                  <Label htmlFor={`${baseId}-label-${index}`} className="text-xs">
                    Text
                  </Label>
                  <Input
                    id={`${baseId}-label-${index}`}
                    value={link.label}
                    maxLength={40}
                    placeholder="e.g. Book a table"
                    aria-invalid={Boolean(errors[`links.${index}.label`]) || undefined}
                    onChange={(event) => setLink(index, { label: event.target.value })}
                  />
                  {errors[`links.${index}.label`] && (
                    <p className="text-xs text-destructive">{errors[`links.${index}.label`]}</p>
                  )}
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${baseId}-href-${index}`} className="text-xs">
                    Goes to
                  </Label>
                  <Input
                    id={`${baseId}-href-${index}`}
                    value={link.href}
                    placeholder="https://…"
                    aria-invalid={Boolean(errors[`links.${index}.href`]) || undefined}
                    onChange={(event) => setLink(index, { href: event.target.value })}
                  />
                  {errors[`links.${index}.href`] && (
                    <p className="text-xs text-destructive">{errors[`links.${index}.href`]}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-5"
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      links: current.links.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <Trash2Icon aria-hidden />
                  <span className="sr-only">Remove link {link.label}</span>
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={values.links.length >= MAX_EXTRA_LINKS}
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  links: [
                    ...current.links,
                    { id: globalThis.crypto.randomUUID(), label: "", href: "" },
                  ],
                }))
              }
            >
              <PlusIcon aria-hidden />
              {values.links.length >= MAX_EXTRA_LINKS
                ? `Up to ${MAX_EXTRA_LINKS} links`
                : "Add a link"}
            </Button>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social media</CardTitle>
          <CardDescription>Shown in your footer. Leave empty to hide.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <div key={network.id} className="grid gap-1">
              <Label htmlFor={`${baseId}-${network.id}`}>{network.label}</Label>
              <Input
                id={`${baseId}-${network.id}`}
                value={values.social[network.id] ?? ""}
                placeholder={network.placeholder}
                aria-invalid={Boolean(errors[`social.${network.id}`]) || undefined}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    social: { ...current.social, [network.id]: event.target.value },
                  }))
                }
              />
              {errors[`social.${network.id}`] && (
                <p className="text-xs text-destructive">{errors[`social.${network.id}`]}</p>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setValues(saved);
                  setErrors({});
                }}
                disabled={pending}
              >
                Discard
              </Button>
            )}
            <Button onClick={save} disabled={!dirty || pending}>
              {pending && <Loader2Icon className="animate-spin" aria-hidden />}
              Save
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
