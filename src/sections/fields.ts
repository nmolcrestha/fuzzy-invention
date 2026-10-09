// Field definitions for section content. One definition drives three things:
//   1. the settings form in the editor (by `kind`),
//   2. validation of saved drafts (`schema`), and
//   3. default content for new sections (`default`).
//
// Draft validation is structural only (types, lengths). `required` is a hint shown in the form
// and checked before publishing, so autosave never fails while someone is still typing.
import { z } from "zod";

import { ICON_NAMES, type IconName } from "./icons";
import {
  type RichBlock,
  type RichMark,
  type RichTextDoc,
  richText,
  richTextDocSchema,
} from "./rich-text";

type Common = { label: string; help?: string; required?: boolean };

export type ImageValue = { src: string; alt: string };
export type LinkValue = { label: string; href: string };

export type TextField = Common & {
  kind: "text";
  multiline?: boolean;
  max: number;
  placeholder?: string;
  schema: z.ZodType<string>;
  default: string;
};
export type RichTextField = Common & {
  kind: "richText";
  marks: RichMark[];
  blocks: RichBlock[];
  schema: z.ZodType<RichTextDoc>;
  default: RichTextDoc;
};
export type ImageField = Common & {
  kind: "image";
  schema: z.ZodType<ImageValue>;
  default: ImageValue;
};
export type LinkField = Common & { kind: "link"; schema: z.ZodType<LinkValue>; default: LinkValue };
export type SelectField = Common & {
  kind: "select";
  options: { value: string; label: string }[];
  schema: z.ZodType<string>;
  default: string;
};
export type ToggleField = Common & { kind: "toggle"; schema: z.ZodType<boolean>; default: boolean };
export type IconField = Common & { kind: "icon"; schema: z.ZodType<IconName>; default: IconName };
export type ListField = Common & {
  kind: "list";
  itemLabel: string;
  /** Which item field to show as the item's title in the editor. */
  titleField: string;
  fields: Record<string, Field>;
  min: number;
  max: number;
  schema: z.ZodType<ListItem[]>;
  default: ListItem[];
  /** Content for a newly added item. */
  newItem: () => Record<string, unknown>;
};

export type Field =
  | TextField
  | RichTextField
  | ImageField
  | LinkField
  | SelectField
  | ToggleField
  | IconField
  | ListField;

export type Fields = Record<string, Field>;
export type ListItem = { id: string } & Record<string, unknown>;

const newId = () => globalThis.crypto.randomUUID();

export const f = {
  text(
    opts: Common & { max?: number; multiline?: boolean; placeholder?: string; default?: string },
  ): TextField {
    const max = opts.max ?? (opts.multiline ? 600 : 120);
    const fallback = opts.default ?? "";
    return {
      kind: "text",
      ...opts,
      max,
      schema: z.string().max(max).catch(fallback),
      default: fallback,
    };
  },

  richText(
    opts: Common & { marks?: RichMark[]; blocks?: RichBlock[]; default?: RichTextDoc },
  ): RichTextField {
    const fallback = opts.default ?? richText("");
    return {
      kind: "richText",
      marks: opts.marks ?? ["bold", "italic", "link"],
      blocks: opts.blocks ?? ["paragraph"],
      ...opts,
      schema: richTextDocSchema.catch(fallback),
      default: fallback,
    };
  },

  image(opts: Common & { default?: ImageValue }): ImageField {
    const fallback = opts.default ?? { src: "", alt: "" };
    return {
      kind: "image",
      ...opts,
      schema: z
        .object({
          src: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).catch(""),
          alt: z.string().max(200).catch(""),
        })
        .catch(fallback),
      default: fallback,
    };
  },

  link(opts: Common & { default?: LinkValue }): LinkField {
    const fallback = opts.default ?? { label: "", href: "" };
    return {
      kind: "link",
      ...opts,
      schema: z
        .object({ label: z.string().max(60).catch(""), href: z.string().max(2000).catch("") })
        .catch(fallback),
      default: fallback,
    };
  },

  select<const V extends string>(
    opts: Common & { options: readonly { value: V; label: string }[]; default: V },
  ): SelectField {
    const values = opts.options.map((option) => option.value) as [V, ...V[]];
    return {
      kind: "select",
      ...opts,
      options: [...opts.options],
      schema: z.enum(values).catch(opts.default),
      default: opts.default,
    };
  },

  toggle(opts: Common & { default?: boolean }): ToggleField {
    const fallback = opts.default ?? false;
    return { kind: "toggle", ...opts, schema: z.boolean().catch(fallback), default: fallback };
  },

  icon(opts: Common & { default: IconName }): IconField {
    return {
      kind: "icon",
      ...opts,
      schema: z.enum(ICON_NAMES).catch(opts.default),
      default: opts.default,
    };
  },

  list(
    opts: Common & {
      itemLabel: string;
      titleField: string;
      fields: Fields;
      min?: number;
      max?: number;
      default?: Record<string, unknown>[];
    },
  ): ListField {
    const itemSchema = z
      .object({ id: z.string().min(1).max(64), ...shape(opts.fields) })
      .loose() as unknown as z.ZodType<ListItem>;
    const max = opts.max ?? 12;
    const newItem = () => ({ ...defaults(opts.fields) });
    const fallback = (opts.default ?? []).map((item) => ({ id: newId(), ...newItem(), ...item }));
    return {
      kind: "list",
      ...opts,
      min: opts.min ?? 0,
      max,
      newItem,
      schema: z.array(itemSchema).max(max).catch(fallback),
      default: fallback,
    };
  },
};

function shape(fields: Fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      (field.schema as z.ZodType).optional().default(field.default as never),
    ]),
  );
}

/** Zod schema for a whole section's data. Missing keys are filled with defaults. */
export function dataSchema(fields: Fields) {
  return z.object(shape(fields));
}

/** Fresh default content, with new ids for list items. */
export function defaults(fields: Fields): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      field.kind === "list"
        ? field.default.map((item) => ({ ...structuredClone(item), id: newId() }))
        : structuredClone(field.default),
    ]),
  );
}
