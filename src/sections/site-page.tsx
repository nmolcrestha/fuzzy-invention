import { cn } from "@/lib/utils";

import { SECTION_COMPONENTS, type SiteContext } from "./components";
import type { ChromeBlocks, SectionBlock } from "./registry";

export type PageDocument = { sections: SectionBlock[] } & ChromeBlocks;

function Block({
  block,
  site,
  as: Tag,
}: {
  block: SectionBlock;
  site: SiteContext;
  as: "section" | "header" | "footer";
}) {
  const Component = SECTION_COMPONENTS[block.type];
  if (!Component) return null;
  const isChrome = Tag !== "section";
  return (
    <Tag
      id={block.style.anchorId || undefined}
      data-sq-id={block.id}
      data-sq-type={block.type}
      data-bg={block.style.background ?? "default"}
      {...(!isChrome && { "data-spacing": block.style.spacing ?? "normal" })}
      className={cn(
        Tag === "header" && "border-b border-sq-border",
        Tag === "footer" && "border-t border-sq-border",
      )}
    >
      <Component data={block.data} variant={block.variant} site={site} />
    </Tag>
  );
}

/** A full page of a built website: header, visible sections, footer. */
export function SitePage({
  doc,
  site,
  className,
}: {
  doc: PageDocument;
  site: SiteContext;
  className?: string;
}) {
  return (
    <div className={cn("sq-site flex min-h-svh flex-col", className)}>
      <Block block={doc.header} site={site} as="header" />
      <main className="flex-1">
        {doc.sections
          .filter((block) => !block.isHidden)
          .map((block) => (
            <Block key={block.id} block={block} site={site} as="section" />
          ))}
      </main>
      <Block block={doc.footer} site={site} as="footer" />
    </div>
  );
}
