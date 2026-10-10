// Contact form section (requirement FRM-1) and the validation of messages sent through it.
// Shared by the editor, the renderer and the submit route, so the rules can't drift apart.
import type { ListItem } from "./fields";
import { f } from "./fields";
import { defineSection } from "./types";

export const FORM_FIELD_KINDS = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "message", label: "Long text" },
] as const;

export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number]["value"];

export const formSection = defineSection({
  type: "form",
  name: "Contact form",
  description: "Let visitors send you a message. Messages arrive in your dashboard inbox.",
  category: "contact",
  placement: "page",
  schemaVersion: 1,
  variants: [
    { id: "split", label: "Text beside the form" },
    { id: "card", label: "Form in a card" },
  ],
  fields: {
    heading: f.text({ label: "Heading", max: 100, default: "Send us a message" }),
    intro: f.text({
      label: "Intro",
      multiline: true,
      max: 300,
      default: "Questions, bookings or just saying hello: we usually reply within a day.",
    }),
    fields: f.list({
      label: "Form fields",
      itemLabel: "field",
      titleField: "label",
      min: 1,
      max: 8,
      fields: {
        label: f.text({ label: "Label", required: true, max: 60, default: "Your question" }),
        kind: f.select({ label: "Type", options: FORM_FIELD_KINDS, default: "text" }),
        required: f.toggle({ label: "Visitors must fill this in", default: false }),
      },
      default: [
        { label: "Name", kind: "text", required: true },
        { label: "Email", kind: "email", required: true },
        { label: "Message", kind: "message", required: true },
      ],
    }),
    submitLabel: f.text({ label: "Button text", max: 40, default: "Send message" }),
    successMessage: f.text({
      label: "Thank-you message",
      multiline: true,
      max: 300,
      default: "Thanks! We got your message and will get back to you soon.",
    }),
  },
});

export type FormFieldItem = ListItem & { label: string; kind: FormFieldKind; required: boolean };
export type ContactFormData = {
  heading: string;
  intro: string;
  fields: FormFieldItem[];
  submitLabel: string;
  successMessage: string;
};

/** Name of a form field's input: "f_<item id>". */
export const inputName = (field: { id: string }) => `f_${field.id}`;
/** Hidden field that only bots fill in. */
export const HONEYPOT = "website";

const MAX_LENGTH: Record<FormFieldKind, number> = {
  text: 200,
  email: 200,
  phone: 40,
  message: 5000,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s./-]{5,40}$/;

export type FormValidation =
  | { ok: true; fields: { label: string; value: string }[] }
  | { ok: false; errors: Record<string, string> };

/** Checks a submission against the published form. Errors are keyed by input name. */
export function validateSubmission(
  fields: FormFieldItem[],
  get: (name: string) => string,
): FormValidation {
  const errors: Record<string, string> = {};
  const values: { label: string; value: string }[] = [];
  for (const field of fields) {
    const name = inputName(field);
    const value = get(name).trim();
    const label = field.label.trim() || "This field";
    if (!value) {
      if (field.required) errors[name] = `${label} is required.`;
    } else if (value.length > MAX_LENGTH[field.kind]) {
      errors[name] = `${label} is too long.`;
    } else if (field.kind === "email" && !EMAIL.test(value)) {
      errors[name] = "Enter an email address like name@example.com.";
    } else if (field.kind === "phone" && !PHONE.test(value)) {
      errors[name] = "Enter a phone number using digits, spaces and + only.";
    }
    values.push({ label, value });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (values.every((item) => !item.value)) {
    return { ok: false, errors: { form: "Fill in at least one field." } };
  }
  return { ok: true, fields: values };
}

/** The sender's email, if the form asked for one (for "Reply" links). */
export function replyAddress(submitted: { label: string; value: string }[]): string | null {
  return submitted.find((item) => EMAIL.test(item.value))?.value ?? null;
}
