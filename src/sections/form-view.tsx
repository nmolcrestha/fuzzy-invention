// Contact form section. No hooks here (the interactive part is ContactFormClient), so it renders
// both in the editor preview and on live sites.
import { cn } from "@/lib/utils";

import type { ContactFormData } from "./form";
import { ContactFormClient } from "./form-client";
import { container, type SectionProps } from "./parts";

export function ContactForm({ data, variant, site, sectionId }: SectionProps<ContactFormData>) {
  const intro = (
    <div>
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{data.heading}</h2>
      {data.intro && <p className="mt-4 text-lg text-sq-muted-fg">{data.intro}</p>}
      {variant === "split" && (site.contact.email || site.contact.phone) && (
        <dl className="mt-8 grid gap-4 text-sm">
          {site.contact.email && (
            <div>
              <dt className="font-semibold text-sq-muted-fg">Email</dt>
              <dd className="text-base">
                <a href={`mailto:${site.contact.email}`} className="hover:underline">
                  {site.contact.email}
                </a>
              </dd>
            </div>
          )}
          {site.contact.phone && (
            <div>
              <dt className="font-semibold text-sq-muted-fg">Phone</dt>
              <dd className="text-base">
                <a
                  href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
                  className="hover:underline"
                >
                  {site.contact.phone}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
  const form = (
    <div className="sq-form">
      <ContactFormClient
        sectionId={sectionId}
        fields={data.fields}
        submitLabel={data.submitLabel}
        successMessage={data.successMessage}
        live={Boolean(site.live)}
      />
    </div>
  );

  if (variant === "card") {
    return (
      <div className={cn(container, "max-w-2xl")}>
        <div className="rounded-sq border border-sq-border bg-sq-surface p-6 md:p-10">
          {intro}
          <div className="mt-8">{form}</div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn(container, "grid gap-10 md:grid-cols-2 md:gap-16")}>
      {intro}
      {form}
    </div>
  );
}
