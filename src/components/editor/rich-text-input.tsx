"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type RichBlock, type RichMark, type RichTextDoc, safeHref } from "@/sections/rich-text";

type Props = {
  id: string;
  value: RichTextDoc;
  onChange: (value: RichTextDoc) => void;
  marks: RichMark[];
  blocks: RichBlock[];
  "aria-describedby"?: string;
};

export function RichTextInput({ id, value, onChange, marks, blocks, ...aria }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const has = (item: RichMark | RichBlock) =>
    (marks as string[]).includes(item) || (blocks as string[]).includes(item);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Undo/redo is handled by the editor-wide history (Ctrl+Z works across all fields).
        undoRedo: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        bold: has("bold") ? {} : false,
        italic: has("italic") ? {} : false,
        heading: has("heading") ? { levels: [2, 3] } : false,
        bulletList: has("bulletList") ? {} : false,
        orderedList: has("orderedList") ? {} : false,
        listItem: has("bulletList") || has("orderedList") ? {} : false,
        listKeymap: has("bulletList") || has("orderedList") ? {} : false,
        link: has("link")
          ? { openOnClick: false, autolink: true, isAllowedUri: (url) => safeHref(url) !== null }
          : false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        ...(aria["aria-describedby"] && { "aria-describedby": aria["aria-describedby"] }),
        class: cn(
          "min-h-20 px-3 py-2 text-sm outline-none",
          "[&_p+p]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-5 [&_a]:underline",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDoc),
  });

  // Follow outside changes (undo/redo) without moving the cursor while typing.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            link: editor.isActive("link"),
            heading: editor.isActive("heading", { level: 2 }),
            bulletList: editor.isActive("bulletList"),
            orderedList: editor.isActive("orderedList"),
            href: (editor.getAttributes("link").href as string | undefined) ?? "",
          }
        : null,
  });

  const tools: {
    key: keyof NonNullable<typeof state>;
    label: string;
    icon: LucideIcon;
    run: () => void;
    show: boolean;
  }[] =
    editor && state
      ? [
          {
            key: "bold",
            label: "Bold (Ctrl+B)",
            icon: BoldIcon,
            show: has("bold"),
            run: () => editor.chain().focus().toggleBold().run(),
          },
          {
            key: "italic",
            label: "Italic (Ctrl+I)",
            icon: ItalicIcon,
            show: has("italic"),
            run: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            key: "heading",
            label: "Subheading",
            icon: Heading2Icon,
            show: has("heading"),
            run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          },
          {
            key: "bulletList",
            label: "Bulleted list",
            icon: ListIcon,
            show: has("bulletList"),
            run: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            key: "orderedList",
            label: "Numbered list",
            icon: ListOrderedIcon,
            show: has("orderedList"),
            run: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            key: "link",
            label: "Link",
            icon: LinkIcon,
            show: has("link"),
            run: () => setLinkOpen((open) => !open),
          },
        ]
      : [];

  return (
    <div className="rounded-lg border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls={id}
        className="flex flex-wrap gap-0.5 border-b p-1"
      >
        {tools
          .filter((tool) => tool.show)
          .map((tool) => (
            <Tooltip key={tool.key}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-pressed={Boolean(state?.[tool.key])}
                    className="aria-pressed:bg-muted aria-pressed:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={tool.run}
                  />
                }
              >
                <tool.icon aria-hidden />
                <span className="sr-only">{tool.label}</span>
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
      </div>
      {linkOpen && editor && (
        <LinkEditor
          initial={state?.href ?? ""}
          onApply={(href) => {
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
            setLinkOpen(false);
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setLinkOpen(false);
          }}
          onCancel={() => setLinkOpen(false)}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function LinkEditor({
  initial,
  onApply,
  onRemove,
  onCancel,
}: {
  initial: string;
  onApply: (href: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [href, setHref] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  function apply() {
    const value = href.trim();
    const withProtocol = /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value) ? `https://${value}` : value;
    const safe = safeHref(withProtocol);
    if (!safe) {
      setError("Use a web address (https://…), an email (mailto:…), or a page like /about.");
      return;
    }
    onApply(safe);
  }

  return (
    <div className="space-y-2 border-b bg-muted/40 p-2">
      <label htmlFor={inputId} className="text-xs font-medium">
        Link to
      </label>
      <Input
        id={inputId}
        value={href}
        autoFocus
        placeholder="https://example.com or /about"
        onChange={(event) => {
          setHref(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
          if (event.key === "Escape") onCancel();
        }}
        aria-invalid={Boolean(error) || undefined}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-1">
        {initial && (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            Remove link
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
