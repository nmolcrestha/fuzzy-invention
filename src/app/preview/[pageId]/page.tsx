import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PreviewClient } from "@/components/editor/preview-client";
import { requireUser } from "@/lib/session";
import { SECTION_DEFS } from "@/sections/registry";
import { loadEditor } from "@/server/editor/queries";
import { findOwnedPage } from "@/server/sites/access";

export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false },
};

const SECTION_NAMES = Object.fromEntries(
  Object.values(SECTION_DEFS).map((def) => [def.type, def.name]),
);

async function Preview({ params, searchParams }: PageProps<"/preview/[pageId]">) {
  const [{ pageId }, query] = await Promise.all([params, searchParams]);
  const me = await requireUser();
  const found = await findOwnedPage(me.id, pageId);
  if (!found) notFound();
  const data = await loadEditor(found.site.id, pageId);

  return (
    <PreviewClient
      initialDoc={data.doc}
      initialTheme={data.theme}
      site={data.siteContext}
      embedded={query.embed === "1"}
      selectable={query.mode !== "view"}
      sectionNames={SECTION_NAMES}
    />
  );
}

export default function PreviewPage(props: PageProps<"/preview/[pageId]">) {
  return (
    <Suspense>
      <Preview {...props} />
    </Suspense>
  );
}
