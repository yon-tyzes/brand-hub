// Shared editor context: state, dispatch, and helpers every panel needs.
import { createContext, useContext } from "react";
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { Session } from "../../adapters/types.ts";
import type { Brand } from "../../../schemas/brand.ts";
import type { EditorModule, EditorView } from "../editor/modules.ts";
import type { Edit, EditorAction, EditorState } from "../editor/state.ts";

export interface ToastInput {
  message: string;
  action?: { label: string; run: () => void };
}

export interface EditorApi {
  state: EditorState;
  dispatch: (a: EditorAction) => void;
  /** Applies an edit. Edits with the same key in quick succession share one undo step. */
  apply: (edit: Edit, key?: string) => void;
  session: Session;
  module: EditorModule;
  setModule: (id: string) => void;
  /** What the editor shows: the Overview, a module, or Brand settings. */
  view: EditorView;
  /** Shows a view and puts it in the address. */
  go: (view: EditorView) => void;
  /** The brand settings as edited in this draft. */
  brand: Brand;
  selectedId: string | null;
  select: (id: string | null) => void;
  toast: (t: ToastInput) => void;
  /** URL for a file path: uploads use object URLs, existing files are served from /files. */
  urlFor: (path: string) => string;
  svgFor: (path: string) => string | undefined;
  /** Display name of a stored file: the uploaded file's name, or the file name without folders. */
  fileLabel: (path: string) => string;
  records: AnyRecord[];
  /** Opens the replace-file flow for a record with the given file. */
  replaceFile: (id: string, file: File) => void;
  /** Adds files to the current section, or to the given one. */
  addFiles: (files: File[], moduleId?: string) => void;
  retireItems: (ids: string[]) => void;
  /** Problems the last save attempt found for an item, in plain words. */
  issuesFor: (id: string) => string[];
  /** Opens an item in the inspector and moves focus to its first field. */
  edit: (id: string) => void;
  /** Closes the inspector and returns focus to the card it was opened from. */
  closeInspector: () => void;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error("useEditor outside the editor");
  return api;
}
