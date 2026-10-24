// The editor at /admin (docs/ENGINE_SPEC.md, section 7). Loads the session and draft through the adapters
// chosen in hub.config.ts, keeps every edit in an in-memory change set with undo, autosaves it to IndexedDB,
// and saves and publishes through the content adapter after the serializer validates the result.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AnyRecord, LogoAsset } from "../../../schemas/asset.ts";
import { auth, content, mode } from "virtual:brand-hub/admin";
import { AdapterError, canRestore, ConflictError, type BrandContent, type Session } from "../../adapters/types.ts";
import { filePaths } from "../../content/file-paths.ts";
import { fileName, fileUrl } from "../../lib/paths.ts";
import type { PageId } from "../../site/Page.tsx";
import { changes as listChanges, rebase, serializeDraft, today, type SerializeError } from "../editor/changeset.ts";
import { extension } from "../editor/files.ts";
import { accepts, ingest, recordsFromUploads, type Upload } from "../editor/ingest.ts";
import { EDITOR_MODULES, pathForView, SETTINGS, viewFromPath, type EditorView } from "../editor/modules.ts";
import { addRecord, attachFiles, reducer, restoreStatuses, retire, type EditorAction, type EditorState, type StoredFile } from "../editor/state.ts";
import { clearSaved, loadSaved, save } from "../editor/storage.ts";
import type { PreviewData } from "../preview/protocol.ts";
import { EditorContext, type EditorApi } from "./context.tsx";
import { ChangesDialog, ReplaceDialog } from "./Dialogs.tsx";
import { issuesById } from "./explain.ts";
import { Grid, type StatusFilter } from "./Grid.tsx";
import { Inspector } from "./Inspector.tsx";
import { PreviewPanel } from "./PreviewPanel.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { ConflictDialog, FailureDialog, HistoryDialog, ProblemsDialog } from "./SaveDialogs.tsx";
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

/** Words for an error from an adapter, for the person editing. */
const plain = (e: unknown, action: "save" | "publish") =>
  e instanceof AdapterError ? e.message : `${action === "save" ? "Saving" : "Publishing"} didn't finish. Check your connection and try again.`;

type Dialog =
  | { kind: "changes" }
  | { kind: "problems" }
  | { kind: "history" }
  | { kind: "preview" }
  | { kind: "failure"; action: "save" | "publish"; message: string }
  | { kind: "conflict"; remote: { revision: string; data: BrandContent } };

const historyLoader = () => content.history(20);

/**
 * With the local adapter, a save rewrites brand files and the dev server reloads the page. The editor
 * leaves a short-lived note so the reload comes back with the same section, item, and message.
 */
const AFTER_RELOAD = "bh-editor-after-reload";
/** The inspector's first form control: the checked status option, or the first field. */
const FIRST_FIELD = ".inspector :is(input[type=radio]:checked, input:not([type=radio]):not([type=hidden]), select, textarea)";

type AfterReload = { message: string; moduleId: string; selectedId: string | null; at: number };

function rememberForReload(note: Omit<AfterReload, "at">) {
  try {
    sessionStorage.setItem(AFTER_RELOAD, JSON.stringify({ ...note, at: Date.now() }));
  } catch {
    // Storage blocked: the reload just starts fresh.
  }
}

function takeReloadNote(): AfterReload | undefined {
  try {
    const raw = sessionStorage.getItem(AFTER_RELOAD);
    sessionStorage.removeItem(AFTER_RELOAD);
    const note = raw ? (JSON.parse(raw) as AfterReload) : undefined;
    return note && Date.now() - note.at < 15_000 ? note : undefined;
  } catch {
    return undefined;
  }
}

/** Placeholder for views built in later steps. */
function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="ed-page">
      <h1 className="ed-title">{title}</h1>
    </div>
  );
}

export default function AdminApp() {
  const [state, dispatch] = useReducer(rootReducer, null);
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState<string>();
  const [view, setView] = useState<EditorView>(() => (typeof location === "undefined" ? "overview" : viewFromPath(location.pathname)));
  const [moduleId, setModuleId] = useState(() => (EDITOR_MODULES.some((m) => m.id === view) ? view : EDITOR_MODULES[0]!.id));
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [replacing, setReplacing] = useState<{ id: string; upload: Upload } | null>(null);
  const [autosave, setAutosave] = useState<"on" | "off">("on");
  const [busy, setBusy] = useState<"saving" | "publishing" | null>(null);
  const [errors, setErrors] = useState<SerializeError[]>([]);
  const [unpublished, setUnpublished] = useState(false);
  const { toast, show, clear } = useToasts();
  const wide = useWide();
  const urls = useRef(new Map<string, string>());
  // Keyboard focus around the inspector: Edit moves focus to its first field, and closing it returns focus
  // to the card it was opened from.
  const openedFrom = useRef<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const slug = state?.base.slug;

  // Load the session and the draft, then any autosaved work for the same revision.
  useEffect(() => {
    (async () => {
      const s = await auth.getSession();
      if (!s) return setFailed("Sign in to edit the brand.");
      setSession(s);
      const loaded = await content.loadDraft();
      if (!loaded) return setFailed("The brand could not be loaded. Reload the page to try again.");
      const saved = await loadSaved(loaded.data.slug);
      const note = takeReloadNote();
      if (note) {
        if (EDITOR_MODULES.some((m) => m.id === note.moduleId)) setModuleId(note.moduleId);
        setSelectedId(note.selectedId);
        show({ message: note.message });
      }
      if (saved && saved.revision === loaded.revision) {
        dispatch({ type: "load", revision: loaded.revision, base: loaded.data, present: saved.draft });
        if (!note) show({ message: "Your unsaved changes from last time are back." });
      } else if (saved?.baseRecords) {
        // The brand changed since the draft was autosaved: replay the draft's edits on the new version.
        const old = { revision: saved.revision, base: { ...loaded.data, records: saved.baseRecords }, present: saved.draft, past: [], future: [] };
        dispatch({ type: "load", revision: loaded.revision, base: loaded.data, present: { records: rebase(old, loaded.data), files: saved.draft.files } });
        show({ message: "The brand changed since your last edit. Your unsaved changes are kept on top of the new version." });
      } else {
        if (saved) await clearSaved(loaded.data.slug);
        dispatch({ type: "load", revision: loaded.revision, base: loaded.data });
      }
    })().catch((e) => setFailed(e instanceof AdapterError ? e.message : "The brand could not be loaded. Reload the page to try again."));
  }, []);

  const changes = useMemo(() => (state ? listChanges(state.base, state.present) : []), [state?.base, state?.present]);
  const issues = useMemo(
    () => (state ? issuesById(errors, state.present.records, state.base.records) : new Map<string, string[]>()),
    [errors, state?.present, state?.base],
  );

  // Autosave, debounced.
  useEffect(() => {
    if (!state || !slug) return;
    const t = setTimeout(async () => {
      if (!changes.length) return void clearSaved(slug);
      const ok = await save(slug, { revision: state.revision, draft: state.present, savedAt: new Date().toISOString(), baseRecords: state.base.records });
      setAutosave(ok ? "on" : "off");
    }, 400);
    return () => clearTimeout(t);
  }, [state?.present]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!changes.length) return;
    const guard = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [changes.length > 0]);

  // On wide screens the inspector is a side panel: focus its first field after Edit. The sheet used on small
  // screens does this itself through `initialFocus`.
  useEffect(() => {
    if (focusRequest && wide) document.querySelector<HTMLElement>(`.admin-inspector ${FIRST_FIELD}`)?.focus();
  }, [focusRequest]);

  useEffect(() => {
    if (selectedId || !openedFrom.current) return;
    const id = openedFrom.current;
    openedFrom.current = null;
    document.querySelector<HTMLElement>(`.admin-card[data-id="${CSS.escape(id)}"] .admin-card-title`)?.focus();
  }, [selectedId]);

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

  // Back and forward move between views.
  useEffect(() => {
    const onPop = () => {
      const v = viewFromPath(location.pathname);
      setView(v);
      if (EDITOR_MODULES.some((m) => m.id === v)) setModuleId(v);
      setSelectedId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: EditorView) => {
    if (location.pathname !== pathForView(next)) history.pushState(null, "", pathForView(next));
    setView(next);
    if (EDITOR_MODULES.some((m) => m.id === next)) setModuleId(next);
    setSelectedId(null);
  }, []);

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
    const added = recordsFromUploads(target, uploads, new Set(records.map((r) => r.id)));
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

  // ---------- Save, publish, conflicts, history ----------

  async function saveDraft(from: EditorState = state!): Promise<boolean> {
    const result = serializeDraft(from, session!.name, today());
    if (!result.ok) {
      setErrors(result.errors);
      setDialog({ kind: "problems" });
      return false;
    }
    setErrors([]);
    const { changeSet } = result;
    if (!changeSet.upserts.length && !changeSet.deletes.length) return true;
    setBusy("saving");
    try {
      const res = await content.saveDraft(changeSet, session!);
      // Files now live at their final names; keep the uploaded copies so previews still show them.
      const files: Record<string, StoredFile> = {};
      for (const [provisional, final] of Object.entries(result.renamed)) {
        const f = from.present.files[provisional];
        if (f) files[final] = { ...f, path: final };
      }
      const base: BrandContent = { ...from.base, records: result.records, sources: result.sources, changelog: result.changelog };
      dispatch({ type: "load", revision: res.revision, base, present: { records: result.records, files } });
      await clearSaved(from.base.slug);
      setUnpublished(true);
      if (!res.previewUrl) rememberForReload({ message: "Draft saved.", moduleId: view, selectedId });
      show({
        message: res.previewUrl ? "Draft saved. A preview link is ready." : "Draft saved.",
        action: res.previewUrl ? { label: "Open preview link", run: () => window.open(res.previewUrl, "_blank", "noopener") } : undefined,
      });
      return true;
    } catch (e) {
      if (e instanceof ConflictError) setDialog({ kind: "conflict", remote: e.remote });
      else setDialog({ kind: "failure", action: "save", message: plain(e, "save") });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (changes.length && !(await saveDraft())) return;
    setBusy("publishing");
    try {
      await content.publish(session!);
      setUnpublished(false);
      show({ message: mode === "demo" ? "Published in this demo. Nothing is kept after a reload." : "Published. The site updates after its next build." });
    } catch (e) {
      if (e instanceof ConflictError) setDialog({ kind: "conflict", remote: e.remote });
      else setDialog({ kind: "failure", action: "publish", message: plain(e, "publish") });
    } finally {
      setBusy(null);
    }
  }

  function resolveConflict(remote: { revision: string; data: BrandContent }, how: "reload" | "overwrite") {
    const present = how === "reload" ? { records: rebase(state!, remote.data), files: state!.present.files } : state!.present;
    dispatch({ type: "load", revision: remote.revision, base: remote.data, present });
    setDialog(null);
    if (how === "overwrite") void saveDraft({ ...state!, revision: remote.revision, base: remote.data, present, past: [], future: [] });
    else show({ message: "Their changes are in. Check your edits, then save again." });
  }

  async function restore(revision: string, date: string) {
    if (!canRestore(content)) return;
    try {
      const old = await content.loadRevision(revision);
      const files: Record<string, StoredFile> = { ...state!.present.files };
      for (const [path, blob] of Object.entries(old.files ?? {})) files[path] = { path, name: fileName(path), type: blob.type, blob };
      dispatch({ type: "apply", edit: () => ({ records: old.data.records, files }) });
      setDialog(null);
      show({ message: `The version from ${date.slice(0, 10)} is back as a draft. Review it, then save.` });
    } catch (e) {
      show({ message: e instanceof AdapterError ? e.message : "That version could not be restored." });
    }
  }

  const previewData = (): PreviewData => {
    const result = serializeDraft(state!, session!.name, today());
    const byPath: Record<string, string> = {};
    for (const path of Object.keys(state!.present.files)) byPath[path] = urlFor(path);
    return {
      brand: state!.base.brand,
      records: state!.present.records,
      changelog: result.ok ? result.changelog : state!.base.changelog,
      urls: byPath,
      svgs: state!.base.svgs,
    };
  };

  const showItem = (id: string) => {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    go(EDITOR_MODULES.find((m) => m.type === r.type)!.id);
    setFilter("all");
    setSelectedId(id);
    setDialog(null);
  };

  const api: EditorApi = {
    state, dispatch, apply, session, module: mod, records,
    setModule: (id) => go(id),
    view, go,
    brand: state.base.brand,
    selectedId, select: setSelectedId,
    edit: (id) => {
      openedFrom.current = id;
      setSelectedId(id);
      setFocusRequest((n) => n + 1);
    },
    closeInspector: () => setSelectedId(null),
    toast: show, urlFor,
    svgFor: (path) => state.base.svgs[path],
    fileLabel: (path) => state.present.files[path]?.name ?? fileName(path),
    replaceFile, addFiles, retireItems,
    issuesFor: (id) => issues.get(id) ?? [],
  };

  const replacingRecord = replacing && records.find((r) => r.id === replacing.id);
  const selected = records.find((r) => r.id === selectedId);
  const previewStart = (moduleId === "rules" ? "guide" : moduleId) as PageId;

  return (
    <EditorContext.Provider value={api}>
      <div className="admin" data-mode={mode}>
        {mode === "demo" && (
          <section className="demo-banner" aria-label="Demo mode">
            <p>Demo mode: changes are not saved.</p>
          </section>
        )}
        <TopBar
          changes={changes}
          autosave={autosave}
          busy={busy}
          canPublish={changes.length > 0 || unpublished}
          onShowChanges={() => setDialog({ kind: "changes" })}
          onPreview={() => setDialog({ kind: "preview" })}
          onSave={() => void saveDraft()}
          onPublish={() => void publish()}
        />
        <div className="ed-body" data-view={view === "overview" ? "overview" : view === SETTINGS ? "settings" : "module"}>
          <Sidebar onHistory={() => setDialog({ kind: "history" })} onSignOut={() => void auth.signOut().then(() => location.reload())} />
          {view === "overview" ? (
            <main className="ed-main" id="main">
              <PlaceholderView title="Overview" />
            </main>
          ) : view === SETTINGS ? (
            <main className="ed-main" id="main">
              <PlaceholderView title="Brand settings" />
            </main>
          ) : (
            <>
        <main className="admin-main" id="main">
          <Grid filter={filter} setFilter={setFilter} key={mod.id} />
        </main>
        {wide ? (
          <aside
            className="admin-inspector"
            aria-label="Details"
            onKeyDown={(e) => {
              // Dialogs opened from the inspector (delete confirm) handle their own Escape.
              if (e.key !== "Escape" || e.defaultPrevented || (e.target as Element).closest("dialog")) return;
              e.preventDefault();
              setSelectedId(null);
            }}
          >
            <Inspector />
          </aside>
        ) : (
          <Sheet open={!!selected} title={selected ? `Details: ${selected.label}` : "Details"} initialFocus={FIRST_FIELD} onClose={() => setSelectedId(null)}>
            <Inspector inSheet />
          </Sheet>
        )}
            </>
          )}
        </div>
      </div>
      {dialog?.kind === "changes" && <ChangesDialog changes={changes} onClose={() => setDialog(null)} />}
      {dialog?.kind === "preview" && <PreviewPanel data={previewData()} startPage={previewStart} onClose={() => setDialog(null)} />}
      {dialog?.kind === "problems" && <ProblemsDialog issues={issues} records={records} base={state.base.records} onShow={showItem} onClose={() => setDialog(null)} />}
      {dialog?.kind === "failure" && (
        <FailureDialog
          action={dialog.action}
          message={dialog.message}
          onClose={() => setDialog(null)}
          onRetry={() => {
            setDialog(null);
            void (dialog.action === "save" ? saveDraft() : publish());
          }}
        />
      )}
      {dialog?.kind === "conflict" && (
        <ConflictDialog
          base={state.base}
          remote={dialog.remote.data}
          onClose={() => setDialog(null)}
          onReload={() => resolveConflict(dialog.remote, "reload")}
          onOverwrite={() => resolveConflict(dialog.remote, "overwrite")}
        />
      )}
      {dialog?.kind === "history" && (
        <HistoryDialog load={historyLoader} onRestore={canRestore(content) ? (e) => void restore(e.revision, e.date) : undefined} onClose={() => setDialog(null)} />
      )}
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
