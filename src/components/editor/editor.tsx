"use client";

import { AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PublishDialog } from "@/components/publish/publish-dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { EditorData } from "@/server/editor/queries";

import { EditorActionsContext, EditorMetaContext } from "./editor-meta";
import { Inspector } from "./inspector";
import { Outline } from "./outline";
import { PreviewFrame } from "./preview-frame";
import { BuildSectionDialog } from "./build-section-dialog";
import { SaveSectionDialog } from "./save-section-dialog";
import { SaveStatus } from "./save-status";
import { SectionPicker } from "./section-picker";
import {
  createEditorStore,
  EditorStoreContext,
  type EditorStore,
  unsavedParts,
  useEditor,
} from "./store";
import { TopBar } from "./top-bar";
import { useAutosave } from "./use-autosave";
import { useSectionActions } from "./use-section-actions";

/** True when the server has a newer draft than the store (changed from another page or tab). */
function serverIsNewer(data: EditorData, state: ReturnType<EditorStore["getState"]>) {
  if (data.revisions.page > state.revisions.page) return true;
  if (data.revisions.design > state.revisions.design) return true;
  return Object.entries(state.shared).some(
    ([id, entry]) => (data.shared[id]?.revision ?? entry.revision) > entry.revision,
  );
}

export function Editor({ data }: { data: EditorData }) {
  // Next keeps visited routes alive, so coming back to a page can revive an old editor whose
  // store predates changes made elsewhere (a shared section edited on another page, a restored
  // version). Start over from the fresh data then, unless there's unsaved work.
  const [instance, setInstance] = useState(() => ({ data, store: createStoreFor(data) }));
  if (data !== instance.data) {
    const state = instance.store.getState();
    const unsaved = unsavedParts(state);
    setInstance(
      serverIsNewer(data, state) && !unsaved.page && !unsaved.design
        ? { data, store: createStoreFor(data) }
        : { data, store: instance.store },
    );
  }
  const { store } = instance;
  const meta = {
    site: data.site,
    page: data.page,
    pages: data.pages,
    checklist: data.checklist,
    theme: data.theme,
  };

  return (
    <EditorMetaContext value={meta}>
      <EditorStoreContext value={store}>
        {/* Keyed by store: hooks bound to it (autosave, shortcuts) start over with it. */}
        <EditorShell key={storeIds.get(store)} data={data} store={store} />
      </EditorStoreContext>
    </EditorMetaContext>
  );
}

const storeIds = new WeakMap<EditorStore, number>();
let nextStoreId = 0;

function createStoreFor(data: EditorData): EditorStore {
  const store = createEditorStore({
    doc: data.doc,
    revisions: data.revisions,
    shared: data.shared,
  });
  storeIds.set(store, nextStoreId++);
  return store;
}

function EditorShell({ data, store }: { data: EditorData; store: EditorStore }) {
  const router = useRouter();
  const { flush, retryNow } = useAutosave(data.page.id, store);
  const actions = useSectionActions();
  const status = useEditor((state) => state.status);
  const selectedId = useEditor((state) => state.selectedId);
  const [picker, setPicker] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [buildOpen, setBuildOpen] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [panel, setPanel] = useState<"sections" | "settings" | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saveBlockId, setSaveBlockId] = useState<string | null>(null);
  const saveBlock = useEditor((state) =>
    saveBlockId ? (state.doc.sections.find((block) => block.id === saveBlockId) ?? null) : null,
  );
  const sectionIds = useEditor((state) => state.doc.sections.map((block) => block.id).join(","));
  const saveBeforePublish = useCallback(() => flush(), [flush]);

  useUndoShortcuts(store);

  // On small screens, open the settings sheet when a section is picked in the preview.
  useEffect(() => {
    return store.subscribe((state, previous) => {
      if (
        state.selectedId &&
        state.selectedId !== previous.selectedId &&
        window.innerWidth < 1024
      ) {
        setPanel("settings");
      }
    });
  }, [store]);

  async function navigate(href: string) {
    if (await flush()) router.push(href);
    else setLeaveTo(href);
  }

  const openPicker = (index: number) => {
    setPanel(null);
    setPicker({ open: true, index });
  };

  const editorActions = {
    openPublish: () => setPublishOpen(true),
    navigate: (href: string) => void navigate(href),
    saveForReuse: (id: string) => setSaveBlockId(id),
  };

  return (
    <EditorActionsContext value={editorActions}>
      <div className="flex h-svh flex-col bg-background">
        <TopBar
          onNavigate={navigate}
          onRetrySave={() => void retryNow()}
          onOpenSections={() => setPanel("sections")}
          onOpenSettings={() => setPanel("settings")}
          onPublish={() => setPublishOpen(true)}
        />

        {status.state === "conflict" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm"
          >
            <AlertTriangleIcon className="size-4 text-destructive" aria-hidden />
            <p className="flex-1">{status.message}</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        )}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_1fr_360px]">
          <aside className="hidden min-h-0 border-r lg:block">
            <Outline onAdd={openPicker} />
          </aside>
          <main className="min-h-0">
            <PreviewFrame pageId={data.page.id} />
          </main>
          <aside className="hidden min-h-0 border-l lg:block" aria-label="Section settings">
            <Inspector />
          </aside>
        </div>

        <div className="border-t px-3 py-2 lg:hidden">
          <SaveStatus onRetry={() => void retryNow()} />
        </div>

        {/* Small screens: the side panels open as sheets. */}
        <Sheet
          open={panel === "sections"}
          onOpenChange={(open) => setPanel(open ? "sections" : null)}
        >
          <SheetContent side="left" className="w-80 p-0">
            <SheetTitle className="sr-only">Sections</SheetTitle>
            <Outline onAdd={openPicker} />
          </SheetContent>
        </Sheet>
        <Sheet
          open={panel === "settings"}
          onOpenChange={(open) => setPanel(open ? "settings" : null)}
        >
          <SheetContent side="right" className="w-[22rem] p-0">
            <SheetTitle className="sr-only">Section settings</SheetTitle>
            {selectedId ? <Inspector /> : <Outline onAdd={openPicker} />}
          </SheetContent>
        </Sheet>

        <SectionPicker
          open={picker.open}
          onOpenChange={(open) => setPicker((current) => ({ ...current, open }))}
          site={data.siteContext}
          theme={data.theme}
          onPick={(type) => {
            actions.insert(type, picker.index);
            setPicker((current) => ({ ...current, open: false }));
          }}
          siteId={data.site.id}
          onPageIds={sectionIds ? sectionIds.split(",") : []}
          onLink={(item) => {
            actions.link(item, picker.index);
            setPicker((current) => ({ ...current, open: false }));
          }}
          onCopy={(item) => {
            actions.copy(item, picker.index);
            setPicker((current) => ({ ...current, open: false }));
          }}
          beforeRemove={saveBeforePublish}
          onBuild={() => {
            setPicker((current) => ({ ...current, open: false }));
            setBuildOpen(true);
          }}
        />

        <BuildSectionDialog
          open={buildOpen}
          onOpenChange={setBuildOpen}
          site={data.siteContext}
          theme={data.theme}
          onBuilt={({ block, complete }) => actions.insertBuilt(block, picker.index, complete)}
          onPickSection={(type) => actions.insert(type, picker.index)}
        />

        <SaveSectionDialog
          block={saveBlock}
          onOpenChange={(open) => !open && setSaveBlockId(null)}
          beforeSave={saveBeforePublish}
        />

        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          siteId={data.site.id}
          currentPageId={data.page.id}
          beforePublish={saveBeforePublish}
        />

        <AlertDialog open={leaveTo !== null} onOpenChange={(open) => !open && setLeaveTo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>
                Your latest changes couldn&apos;t be saved yet. If you leave now, they&apos;ll be
                lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay and keep editing</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => {
                  const href = leaveTo!;
                  setLeaveTo(null);
                  router.push(href);
                }}
              >
                Leave and lose changes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </EditorActionsContext>
  );
}

/** Ctrl/⌘+Z and Ctrl/⌘+Shift+Z (or Ctrl+Y) use the editor's history everywhere, including in fields. */
function useUndoShortcuts(store: EditorStore) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        store.getState().undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        store.getState().redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);
}
