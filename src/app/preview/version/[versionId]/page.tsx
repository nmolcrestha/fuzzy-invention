import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PreviewClient } from "@/components/editor/preview-client";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { SECTION_DEFS } from "@/sections/registry";
import { parsePageSnapshot } from "@/sections/snapshot";
import { loadEditor } from "@/server/editor/queries";
import { findOwnedPage } from "@/server/sites/access";
import { findPageVersionById } from "@/server/versions/queries";

export const metadata: Metadata = {
  title: "Earlier version",
  robots: { index: false, follow: false },
};

const SECTION_NAMES = Object.fromEntries(
  Object.values(SECTION_DEFS).map((def) => [def.type, def.name]),
);

/** A published version of a page, shown with the current header, footer and colors. */
async function VersionPreview({ params }: PageProps<"/preview/version/[versionId]">) {
  const { versionId } = await params;
  const me = await requireUser();
  const version = await findPageVersionById(versionId);
  const found = version ? await findOwnedPage(me.id, version.pageId) : null;
  if (!version || !found) notFound();
  const data = await loadEditor(found.site.id, found.page.id);
  const snapshot = parsePageSnapshot(version.snapshot);

  return (
    <PreviewClient
      initialDoc={{ ...data.doc, sections: snapshot.sections }}
      initialTheme={data.theme}
      site={data.siteContext}
      embedded={false}
      selectable={false}
      sectionNames={SECTION_NAMES}
      banner={`“${snapshot.title}” as published on ${formatDateTime(version.createdAt)}. Only you can see this. Restore it from the History tab.`}
    />
  );
}

export default function VersionPreviewPage(props: PageProps<"/preview/version/[versionId]">) {
  return (
    <Suspense>
      <VersionPreview {...props} />
    </Suspense>
  );
}
