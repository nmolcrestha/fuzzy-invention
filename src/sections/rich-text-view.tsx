import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type RichTextDoc, type RichTextMark, type RichTextNode, safeHref } from "./rich-text";

/**
 * Renders Tiptap JSON to React elements. Unknown nodes are skipped and links are re-checked,
 * so stored content can never inject markup or scripts.
 */
export function RichTextView({
  doc,
  className,
}: {
  doc: RichTextDoc | undefined;
  className?: string;
}) {
  if (!doc?.content?.length) return null;
  return <div className={cn("sq-prose", className)}>{renderNodes(doc.content)}</div>;
}

function renderNodes(nodes: RichTextNode[] = []): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, index));
}

function renderNode(node: RichTextNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{node.content?.length ? renderNodes(node.content) : <br />}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderNodes(node.content)}</h3>
      ) : (
        <h2 key={key}>{renderNodes(node.content)}</h2>
      );
    case "bulletList":
      return <ul key={key}>{renderNodes(node.content)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderNodes(node.content)}</ol>;
    case "listItem":
      return <li key={key}>{renderNodes(node.content)}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return <TextLeaf key={key} text={node.text ?? ""} marks={node.marks ?? []} />;
    default:
      return null;
  }
}

function TextLeaf({ text, marks }: { text: string; marks: RichTextMark[] }) {
  let content: ReactNode = text;
  for (const mark of marks) {
    if (mark.type === "bold") content = <strong>{content}</strong>;
    else if (mark.type === "italic") content = <em>{content}</em>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        const external = /^https?:\/\//i.test(href);
        content = (
          <a href={href} {...(external && { target: "_blank", rel: "noopener noreferrer" })}>
            {content}
          </a>
        );
      }
    }
  }
  return <>{content}</>;
}
