"use client";

import { createContext, useContext } from "react";

import type { ChecklistItem } from "@/server/sites/queries";

export type EditorMeta = {
  site: { id: string; name: string; subdomain: string };
  page: { id: string; title: string; path: string };
  pages: { id: string; title: string; path: string; showInNav: boolean; isHome: boolean }[];
  checklist: { items: ChecklistItem[]; homePageId: string | null } | null;
};

/** Things only the editor shell can do (it owns the dialogs and the save-before-leaving logic). */
export type EditorActions = {
  openPublish: () => void;
  navigate: (href: string) => void;
};

export const EditorActionsContext = createContext<EditorActions | null>(null);

export function useEditorActions(): EditorActions {
  const actions = useContext(EditorActionsContext);
  if (!actions) throw new Error("useEditorActions must be used inside the editor");
  return actions;
}

export const EditorMetaContext = createContext<EditorMeta | null>(null);

export function useEditorMeta(): EditorMeta {
  const meta = useContext(EditorMetaContext);
  if (!meta) throw new Error("useEditorMeta must be used inside the editor");
  return meta;
}
