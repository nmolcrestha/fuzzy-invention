"use client";

import { createContext, useContext } from "react";

export type EditorMeta = {
  site: { id: string; name: string; subdomain: string };
  page: { id: string; title: string; path: string };
  pages: { id: string; title: string; path: string; showInNav: boolean; isHome: boolean }[];
};

export const EditorMetaContext = createContext<EditorMeta | null>(null);

export function useEditorMeta(): EditorMeta {
  const meta = useContext(EditorMetaContext);
  if (!meta) throw new Error("useEditorMeta must be used inside the editor");
  return meta;
}
