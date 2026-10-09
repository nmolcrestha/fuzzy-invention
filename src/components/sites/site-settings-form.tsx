"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { SubdomainField } from "@/components/sites/subdomain-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteHost } from "@/lib/site-url";
import { deleteSite, updateSite } from "@/server/sites/actions";

type SiteSettingsValues = {
  name: string;
  subdomain: string;
  contactEmail: string;
  phone: string;
  address: string;
};

export function SiteSettingsForm({
  siteId,
  initial,
  isPublished,
  retentionDays,
}: {
  siteId: string;
  initial: SiteSettingsValues;
  isPublished: boolean;
  retentionDays: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const dirty = (Object.keys(values) as (keyof SiteSettingsValues)[]).some(
    (key) => values[key] !== saved[key],
  );
  const subdomainChanged = values.subdomain !== saved.subdomain;

  function set<K extends keyof SiteSettingsValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    const result = await updateSite({ siteId, ...values });
    setPending(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    setSaved(values);
    toast.success(
      subdomainChanged
        ? `Saved. Your web address is now ${siteHost(values.subdomain)}.`
        : "Settings saved.",
    );
  }

  async function handleDelete() {
    const result = await deleteSite(siteId);
    if (!result.ok) throw new Error(result.error);
    toast.success(
      `“${saved.name}” moved to Recently deleted. You can restore it for ${retentionDays} days.`,
    );
    router.push("/dashboard");
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Your website&apos;s name, address and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
                <FieldLabel htmlFor="name">Website name</FieldLabel>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={80}
                  required
                />
                {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
              </Field>

              <SubdomainField
                value={values.subdomain}
                onChange={(value) => set("subdomain", value)}
                exceptSiteId={siteId}
                serverError={fieldErrors.subdomain}
              />
              {subdomainChanged && isPublished && (
                <p className="-mt-4 text-sm text-amber-700 dark:text-amber-500">
                  Your website is live. Changing the address means links to{" "}
                  {siteHost(saved.subdomain)} will stop working.
                </p>
              )}

              <Field data-invalid={Boolean(fieldErrors.contactEmail) || undefined}>
                <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
                <Input
                  id="contactEmail"
                  type="email"
                  value={values.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder="hello@example.com"
                />
                {fieldErrors.contactEmail ? (
                  <FieldError>{fieldErrors.contactEmail}</FieldError>
                ) : (
                  <FieldDescription>Used in contact sections and the footer.</FieldDescription>
                )}
              </Field>

              <Field data-invalid={Boolean(fieldErrors.phone) || undefined}>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                {fieldErrors.phone && <FieldError>{fieldErrors.phone}</FieldError>}
              </Field>

              <Field data-invalid={Boolean(fieldErrors.address) || undefined}>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea
                  id="address"
                  rows={3}
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                />
                {fieldErrors.address && <FieldError>{fieldErrors.address}</FieldError>}
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-between gap-4 border-t">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {dirty ? "You have unsaved changes." : "All changes saved."}
            </p>
            <div className="flex gap-2">
              {dirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setValues(saved);
                    setFieldErrors({});
                  }}
                  disabled={pending}
                >
                  Discard
                </Button>
              )}
              <Button type="submit" disabled={!dirty || pending}>
                {pending && <Loader2Icon className="animate-spin" aria-hidden />}
                Save changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle>Delete website</CardTitle>
          <CardDescription>
            Takes the website offline and moves it to Recently deleted. You can restore it for{" "}
            {retentionDays} days.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-t">
          <ConfirmDialog
            trigger={
              <Button variant="destructive">
                <Trash2Icon aria-hidden />
                Delete website
              </Button>
            }
            title={`Delete “${saved.name}”?`}
            description="Here's what will happen:"
            consequences={[
              isPublished
                ? `${siteHost(saved.subdomain)} goes offline right away. Visitors will see a “site not found” page.`
                : "The website and all its pages are removed from your dashboard.",
              `You can restore it from Recently deleted for ${retentionDays} days.`,
              "After that, it's removed for good and can't be recovered.",
            ]}
            confirmText={saved.name}
            confirmLabel="Delete website"
            tone="destructive"
            onConfirm={handleDelete}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
