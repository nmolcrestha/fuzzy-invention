"use client";

import { SitePage } from "@/sections/site-page";
import type { SiteTheme } from "@/sections/theme";
import type { MaterializedSite } from "@/templates/materialize";

const PAGE_WIDTH = 1280;

/** A real render of a template's homepage, scaled down to fit a card. */
export function TemplatePreview({
  site,
  name,
  theme,
  width,
  height,
}: {
  site: MaterializedSite;
  name: string;
  theme: SiteTheme;
  /** Rendered size of the preview box in px. */
  width: number;
  height: number;
}) {
  const home = site.pages.find((page) => page.isHome) ?? site.pages[0];
  if (!home) return null;
  const scale = width / PAGE_WIDTH;

  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none overflow-hidden rounded-md border bg-white"
      style={{ width, height }}
    >
      <div className="origin-top-left" style={{ width: PAGE_WIDTH, transform: `scale(${scale})` }}>
        <SitePage
          doc={{ header: site.header, footer: site.footer, sections: home.blocks }}
          theme={theme}
          site={{
            siteName: name || "Your business",
            nav: site.pages
              .filter((page) => page.showInNav)
              .map((page) => ({ label: page.title, href: page.path })),
            contact: {},
            social: [],
            year: new Date().getFullYear(),
          }}
          className="min-h-0"
        />
      </div>
    </div>
  );
}
