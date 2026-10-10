"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImagePickerField } from "@/components/media/image-picker-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { ImageValue } from "@/sections/fields";
import { updateBranding } from "@/server/sites/actions";

type Branding = { logo: ImageValue; favicon: string; socialImage: string };

/** Logo, browser-tab icon and default social image (requirement SITE-3). */
export function BrandingForm({ siteId, initial }: { siteId: string; initial: Branding }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  async function save() {
    setPending(true);
    const result = await updateBranding({ siteId, ...values });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSaved(values);
    toast.success("Saved. Publish the site design to show it on your website.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo &amp; sharing</CardTitle>
        <CardDescription>
          How your website looks in the header, in browser tabs and when it&apos;s shared.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-8 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="brand-logo">Logo</FieldLabel>
            <ImagePickerField
              id="brand-logo"
              label="Logo"
              siteId={siteId}
              pickerTitle="Choose your logo"
              previewClassName="aspect-[3/2] object-contain p-3"
              value={values.logo}
              onChange={(logo) => setValues({ ...values, logo })}
            />
            <FieldDescription>
              Shown in the header. A wide logo with a transparent background works best.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="brand-favicon">Browser tab icon</FieldLabel>
            <ImagePickerField
              id="brand-favicon"
              label="Browser tab icon"
              siteId={siteId}
              withAlt={false}
              pickerTitle="Choose a browser tab icon"
              previewClassName="aspect-[3/2] object-contain p-6"
              value={{ src: values.favicon, alt: "" }}
              onChange={(image) => setValues({ ...values, favicon: image.src })}
            />
            <FieldDescription>A small square image, like your logo&apos;s symbol.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="brand-social">Social media image</FieldLabel>
            <ImagePickerField
              id="brand-social"
              label="Social media image"
              siteId={siteId}
              withAlt={false}
              pickerTitle="Choose a social media image"
              previewClassName="aspect-[1.91/1]"
              value={{ src: values.socialImage, alt: "" }}
              onChange={(image) => setValues({ ...values, socialImage: image.src })}
            />
            <FieldDescription>
              Shown when a page is shared, unless the page has its own. 1200 × 630 works best.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-between gap-4 border-t">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button variant="ghost" onClick={() => setValues(saved)} disabled={pending}>
              Discard
            </Button>
          )}
          <Button onClick={save} disabled={!dirty || pending}>
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            Save changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
