// The editor at /admin (docs/ENGINE_SPEC.md, section 7). Loads the session and draft through the adapters,
// keeps every edit in an in-memory change set with undo, and autosaves it to IndexedDB.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AnyRecord, LogoAsset } from "../../../schemas/asset.ts";
import { localAuth, localContent } from "../../adapters/local.ts";
import type { BrandContent, Session } from "../../adapters/types.ts";
import { filePaths } from "../../content/file-paths.ts";
import { fileName, fileUrl } from "../../lib/paths.ts";
import { changes as listChanges } from "../editor/changeset.ts";
import { extension } from "../editor/files.ts";
import { accepts, ingest, recordsFromUploads, type Upload } from "../editor/ingest.ts";
import { EDITOR_MODULES } from "../editor/modules.ts";
import { addRecord, attachFiles, initialState, reducer, restoreStatuses, retire, type EditorAction, type EditorState } from "../editor/state.ts";
import { clearSaved, loadSaved, save } from "../editor/storage.ts";
import { EditorContext, type EditorApi } from "./context.tsx";
import { ChangesDialog, PreviewDialog, ReplaceDialog } from "./Dialogs.tsx";
import { Grid, type StatusFilter } from "./Grid.tsx";
import { Inspector } from "./Inspector.tsx";
import { Rail } from "./Rail.tsx";
import { Toasts, useToasts } from "./Toasts.tsx";
import { TopBar } from "./TopBar.tsx";
import { Sheet } from "../../islands/Sheet.tsx";

type Loaded = EditorState | null;
const rootReducer = (s: Loaded, a: EditorAction): Loaded => (a.type === "load" ? reducer(s ?? ({} as EditorState), a) : s && reducer(s, a));

/** Patch that points a record at a replacement file. */
function replacementPatch(r: AnyRecord, u: Upload): Partial<AnyRecord> {
  if (r.type === "icon") return { svgPath: u.path };
  if (r.type === "template") return { thumbnail: u.path };
  if (r.type === "logo") {
    const ext = extension(u.name);
    const entry = { ext, path: u.path, ...(u.width && ext !== "svg" ? { width: u.width } : {}) };
    const i = r.files.findIndex((f) => f.ext === ext);
    const files = i >= 0 ? r.files.map((f, j) => (j === i ? entry : f)) : [...r.files, entry];
    return { files } as Partial<LogoAsset>;
  }
  return {};
}

function useWide() {
  const query = "(min-width: 992px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function AdminApp() {
  const [state, dispatch] = useReducer(rootReducer, null);
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState<string>();
  const [moduleId, setModuleId] = useState(EDITOR_MODULES[0]!.id);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"changes" | "preview" | null>(null);
  const [replacing, setReplacing] = useState<{ id: string; upload: Upload } | null>(null);
  const [autosave, setAutosave] = useState<"on" | "off">("on");
  const { toast, show, clear } = useToasts();
  const wide = useWide();
  const urls = useRef(new Map<string, string>());
  const slug = state?.base.slug;

  // Load the session and the draft, then any autosaved work for the same revision.
  useEffect(() => {
    (async () => {
      const s = await localAuth.getSession();
      if (!s) return setFailed("Sign in to edit the brand.");
      setSession(s);
      const loaded = await localContent.loadDraft();
      if (!loaded) return setFailed("The brand could not be loaded. Reload the page to try again.");
      const saved = await loadSaved(loaded.data.slug);
      if (saved && saved.revision === loaded.revision) {
        dispatch({ type: "load", revision: loaded.revision, base: loaded.data, present: saved.draft });
        show({ message: "Your unsaved changes from last time are back." });
      } else {
        if (saved) await clearSaved(loaded.data.slug);
        dispatch({ type: "load", revision: loaded.revision, base: loaded.data });
      }
    })().catch(() => setFailed("The brand could not be loaded. Reload the page to try again."));
  }, []);

  const changes = useMemo(() => (state ? listChanges(state.base, state.present) : []), [state?.base, state?.present]);

  // Autosave, debounced.
  useEffect(() => {
    if (!state || !slug) return;
    const t = setTimeout(async () => {
      if (!changes.length) return void clearSaved(slug);
      const ok = await save(slug, { revision: state.revision, draft: state.present, savedAt: new Date().toISOString() });
      setAutosave(ok ? "on" : "off");
    }, 400);
    return () => clearTimeout(t);
  }, [state?.present]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!changes.length) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [changes.length > 0]);

  // Undo and redo shortcuts work everywhere in the editor, including in fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (key === "y" && e.ctrlKey) {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const apply = useCallback((edit: Parameters<EditorApi["apply"]>[0], key?: string) => dispatch({ type: "apply", edit, key }), []);

  if (failed || !state || !session) {
    return (
      <main className="admin-message">
        <h1 className="h3">Editor</h1>
        <p role="status">{failed ?? "Loading the editor"}</p>
      </main>
    );
  }

  const mod = EDITOR_MODULES.find((m) => m.id === moduleId)!;
  const records = state.present.records;
  const takenPaths = () => new Set([...Object.keys(state.present.files), ...[...state.base.records, ...records].flatMap((r) => filePaths(r).map((f) => f.path))]);

  const urlFor = (path: string) => {
    const f = state.present.files[path];
    if (!f) return fileUrl(path);
    let u = urls.current.get(path);
    if (!u) urls.current.set(path, (u = URL.createObjectURL(f.blob)));
    return u;
  };

  async function addFiles(files: File[], targetId?: string) {
    const target = EDITOR_MODULES.find((m) => m.id === (targetId ?? moduleId))!;
    if (!target.accept.length) return show({ message: `Files can't be added to ${target.label}. Press Add to create one.` });
    const ok = files.filter((f) => accepts(target, f.name));
    const skipped = files.filter((f) => !ok.includes(f));
    const taken = takenPaths();
    const uploads = (await Promise.all(ok.map((f) => ingest(f, target, taken)))).filter((u) => !u.error);
    const unreadable = ok.length - uploads.length;
    const taken2 = new Set(records.map((r) => r.id));
    const added = recordsFromUploads(target, uploads, taken2);
    if (added.length) {
      dispatch({ type: "apply", edit: (d) => added.reduce((acc, r) => addRecord(r, uploads)(acc), d) });
      setSelectedId(added[0]!.id);
    }
    const parts = [
      added.length ? `Added ${added.length} ${added.length === 1 ? target.noun : `${target.noun}s`}.` : "",
      skipped.length ? `${skipped.map((f) => f.name).join(", ")} can't be added to ${target.label}. Use ${target.accept.map((a) => a.slice(1).toUpperCase()).join(", ")}.` : "",
      unreadable ? `${unreadable} file${unreadable === 1 ? " was" : "s were"} not readable.` : "",
      uploads.some((u) => u.notes.length) ? "Some files were cleaned. See the details on the right." : "",
    ].filter(Boolean);
    if (parts.length) show({ message: parts.join(" ") });
  }

  async function replaceFile(id: string, file: File) {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    const target = EDITOR_MODULES.find((m) => m.type === record.type)!;
    if (!accepts(target, file.name)) return show({ message: `${file.name} can't replace this file. Use ${target.accept.map((a) => a.slice(1).toUpperCase()).join(", ")}.` });
    const upload = await ingest(file, target, takenPaths());
    if (upload.error) return show({ message: `${file.name}: ${upload.error}` });
    setReplacing({ id, upload });
  }

  function retireItems(ids: string[]) {
    const previous = Object.fromEntries(records.filter((r) => ids.includes(r.id)).map((r) => [r.id, r.status]));
    dispatch({ type: "apply", edit: retire(ids) });
    const names = records.filter((r) => ids.includes(r.id)).map((r) => r.label);
    show({
      message: `${names.length === 1 ? names[0] : `${names.length} items`} retired. ${names.length === 1 ? "It leaves" : "They leave"} the site when you publish.`,
      action: { label: "Undo", run: () => dispatch({ type: "apply", edit: restoreStatuses(previous) }) },
    });
  }

  const api: EditorApi = {
    state, dispatch, apply, session, module: mod, records,
    setModule: (id) => {
      setModuleId(id);
      setSelectedId(null);
    },
    selectedId, select: setSelectedId,
    toast: show, urlFor,
    svgFor: (path) => state.base.svgs[path],
    fileLabel: (path) => state.present.files[path]?.name ?? fileName(path),
    replaceFile, addFiles, retireItems,
  };

  const replacingRecord = replacing && records.find((r) => r.id === replacing.id);
  const selected = records.find((r) => r.id === selectedId);

  return (
    <EditorContext.Provider value={api}>
      <div className="admin">
        <TopBar changes={changes} autosave={autosave} onShowChanges={() => setDialog("changes")} onPreview={() => setDialog("preview")} />
        <Rail filter={filter} setFilter={setFilter} />
        <main className="admin-main" id="main">
          <Grid filter={filter} key={mod.id} />
        </main>
        {wide ? (
          <aside className="admin-inspector" aria-label="Details">
            <Inspector />
          </aside>
        ) : (
          <Sheet open={!!selected} title={selected ? `Details: ${selected.label}` : "Details"} onClose={() => setSelectedId(null)}>
            <Inspector inSheet />
          </Sheet>
        )}
      </div>
      {dialog === "changes" && <ChangesDialog changes={changes} onClose={() => setDialog(null)} />}
      {dialog === "preview" && <PreviewDialog onClose={() => setDialog(null)} />}
      {replacing && replacingRecord && (
        <ReplaceDialog
          record={replacingRecord}
          next={{ ...replacingRecord, ...replacementPatch(replacingRecord, replacing.upload) } as AnyRecord}
          upload={replacing.upload}
          onClose={() => setReplacing(null)}
          onConfirm={() => {
            dispatch({ type: "apply", edit: attachFiles(replacing.id, [replacing.upload], replacementPatch(replacingRecord, replacing.upload)) });
            setReplacing(null);
            show({ message: `File replaced for ${replacingRecord.label}.` });
          }}
        />
      )}
      <Toasts toast={toast} clear={clear} />
    </EditorContext.Provider>
  );
}
