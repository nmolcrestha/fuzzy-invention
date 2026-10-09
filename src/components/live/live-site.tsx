import { SitePage } from "@/sections/site-page";
import type { PageSnapshot } from "@/sections/snapshot";
import { type LiveSite, liveSiteContext } from "@/server/live/queries";

/** A published page as visitors see it. */
export function LivePage({ site, page }: { site: LiveSite; page: PageSnapshot }) {
  return (
    <SitePage
      doc={{ header: site.snapshot.header, footer: site.snapshot.footer, sections: page.sections }}
      site={liveSiteContext(site)}
      theme={site.snapshot.theme}
    />
  );
}

/** The site's own 404 page, with its header, footer and theme. */
export function LiveNotFound({ site }: { site: LiveSite }) {
  return (
    <SitePage
      doc={{ header: site.snapshot.header, footer: site.snapshot.footer, sections: [] }}
      site={liveSiteContext(site)}
      theme={site.snapshot.theme}
    >
      <section data-spacing="spacious">
        <div className="mx-auto max-w-xl px-5 text-center">
          <p className="text-sm font-semibold text-sq-primary">404</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-4 text-lg text-sq-muted-fg">
            It may have moved, or the link might be wrong.
          </p>
          <div className="mt-8 flex justify-center">
            <a href="/" className="sq-btn sq-btn-primary">
              Go to the homepage
            </a>
          </div>
        </div>
      </section>
    </SitePage>
  );
}

/** Shown when a web address isn't connected to a live website. */
export function NoSite() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">This website isn&apos;t available</h1>
      <p className="max-w-md text-muted-foreground">
        There&apos;s no published website at this address yet. If it&apos;s yours, publish it from
        your dashboard.
      </p>
    </main>
  );
}
