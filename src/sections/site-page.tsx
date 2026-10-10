import { cn } from "@/lib/utils";

import { SECTION_COMPONENTS, type SiteContext } from "./components";
import type { ChromeBlocks, SectionBlock } from "./registry";
import { DEFAULT_THEME, googleFontsHref, type SiteTheme, themeVars } from "./theme";

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
      <Component data={block.data} variant={block.variant} site={site} sectionId={block.id} />
    </Tag>
  );
}

/** The theme's CSS variables and font stylesheet, applied to a .sq-site root. */
export function themeProps(theme: SiteTheme) {
  return {
    style: themeVars(theme) as React.CSSProperties,
    "data-buttons": theme.buttons,
    "data-mode": theme.mode,
  };
}

export function ThemeFonts({ theme }: { theme: SiteTheme }) {
  // React hoists stylesheets with a precedence into <head> and de-duplicates them.
  return <link rel="stylesheet" href={googleFontsHref(theme)} precedence="default" />;
}

/** A full page of a built website: header, visible sections, footer. */
export function SitePage({
  doc,
  site,
  theme = DEFAULT_THEME,
  className,
  children,
}: {
  doc: PageDocument;
  site: SiteContext;
  theme?: SiteTheme;
  className?: string;
  /** Extra content rendered after the sections (e.g. a 404 message). */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("sq-site flex min-h-svh flex-col", className)} {...themeProps(theme)}>
      <ThemeFonts theme={theme} />
      <Block block={doc.header} site={site} as="header" />
      <main className="flex-1">
        {doc.sections
          .filter((block) => !block.isHidden)
          .map((block) => (
            <Block key={block.id} block={block} site={site} as="section" />
          ))}
        {children}
      </main>
      <Block block={doc.footer} site={site} as="footer" />
    </div>
  );
}
