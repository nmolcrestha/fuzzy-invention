import { Loader2Icon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Editor } from "@/components/editor/editor";
import { loadEditor } from "@/server/editor/queries";

export const metadata: Metadata = { title: "Editor" };

async function EditorLoader({ params }: PageProps<"/editor/[siteId]/[pageId]">) {
  const { siteId, pageId } = await params;
  const data = await loadEditor(siteId, pageId);
  // Keyed by page so switching pages starts with a fresh editor state.
  return <Editor key={data.page.id} data={data} />;
}

export default function EditorPage(props: PageProps<"/editor/[siteId]/[pageId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Opening the editor…
        </div>
      }
    >
      <EditorLoader {...props} />
    </Suspense>
  );
}
