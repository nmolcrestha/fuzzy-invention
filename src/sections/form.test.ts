import { describe, expect, it } from "vitest";

import { type FormFieldItem, inputName, replyAddress, validateSubmission } from "./form";
import { newSectionBlock } from "./registry";

const fields = newSectionBlock("form").data.fields as FormFieldItem[];
const [name, email, message] = fields as [FormFieldItem, FormFieldItem, FormFieldItem];
const answers = (values: Record<string, string>) => (key: string) => values[key] ?? "";

describe("contact form", () => {
  it("starts with name, email and message, all required", () => {
    expect(fields.map((field) => [field.label, field.kind, field.required])).toEqual([
      ["Name", "text", true],
      ["Email", "email", true],
      ["Message", "message", true],
    ]);
  });

  it("accepts a complete message, in the form's order", () => {
    const result = validateSubmission(
      fields,
      answers({
        [inputName(message)]: " Hello! ",
        [inputName(name)]: "Ada",
        [inputName(email)]: "ada@example.com",
      }),
    );
    expect(result).toEqual({
      ok: true,
      fields: [
        { label: "Name", value: "Ada" },
        { label: "Email", value: "ada@example.com" },
        { label: "Message", value: "Hello!" },
      ],
    });
  });

  it("explains what's missing or wrong, per field", () => {
    const result = validateSubmission(
      fields,
      answers({ [inputName(name)]: "Ada", [inputName(email)]: "not-an-email" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[inputName(email)]).toContain("Enter an email address");
    expect(result.errors[inputName(message)]).toBe("Message is required.");
    expect(result.errors[inputName(name)]).toBeUndefined();
  });

  it("checks phone numbers and lengths", () => {
    const phone = { ...name, id: "p", label: "Phone", kind: "phone" as const, required: false };
    expect(validateSubmission([phone], answers({ f_p: "+977 1-4412345" })).ok).toBe(true);
    expect(validateSubmission([phone], answers({ f_p: "call me maybe" })).ok).toBe(false);
    const long = validateSubmission([name], answers({ [inputName(name)]: "x".repeat(201) }));
    expect(long.ok).toBe(false);
  });

  it("refuses a completely empty message", () => {
    const optional = fields.map((field) => ({ ...field, required: false }));
    expect(validateSubmission(optional, answers({}))).toEqual({
      ok: false,
      errors: { form: "Fill in at least one field." },
    });
  });

  it("finds the address to reply to", () => {
    expect(replyAddress([{ label: "Email", value: "ada@example.com" }])).toBe("ada@example.com");
    expect(replyAddress([{ label: "Name", value: "Ada" }])).toBeNull();
  });
});
