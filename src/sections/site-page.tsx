import { cn } from "@/lib/utils";

import { effectiveTone } from "./backdrop";
import { BackdropLayer } from "./backdrop-view";
import { SECTION_COMPONENTS, type SiteContext } from "./components";
import type { ChromeBlocks, SectionBlock } from "./registry";
import { DEFAULT_THEME, googleFontsHref, type SiteTheme, themeVars } from "./theme";

export type PageDocument = { sections: SectionBlock[] } & ChromeBlocks;

function Block({
  block,
  site,
  as: Tag,
  first = false,
}: {
  block: SectionBlock;
  site: SiteContext;
  as: "section" | "header" | "footer";
  /** The first section usually shows above the fold: load its background right away. */
  first?: boolean;
}) {
  const Component = SECTION_COMPONENTS[block.type];
  if (!Component) return null;
  const isChrome = Tag !== "section";
  // Header and footer only use plain color backgrounds.
  const backdrop = isChrome ? undefined : block.style.backdrop;
  return (
    <Tag
      id={block.style.anchorId || undefined}
      data-sq-id={block.id}
      data-sq-type={block.type}
      data-bg={effectiveTone({ background: block.style.background, backdrop })}
      data-backdrop={backdrop?.kind}
      {...(!isChrome && { "data-spacing": block.style.spacing ?? "normal" })}
      className={cn(
        Tag === "header" && "border-b border-sq-border",
        Tag === "footer" && "border-t border-sq-border",
        backdrop && "relative isolate overflow-hidden",
      )}
    >
      {backdrop && <BackdropLayer backdrop={backdrop} eager={first} />}
      <Component
        data={block.data}
        variant={block.variant}
        site={site}
        sectionId={block.id}
        isFirst={first}
      />
    </Tag>
  );
}

/** One section on its own (e.g. a preview in a dialog). Wrap it in a `.sq-site` root. */
export function SectionView({ block, site }: { block: SectionBlock; site: SiteContext }) {
  return <Block block={block} site={site} as="section" />;
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
          .map((block, index) => (
            <Block key={block.id} block={block} site={site} as="section" first={index === 0} />
          ))}
        {children}
      </main>
      <Block block={doc.footer} site={site} as="footer" />
    </div>
  );
}
