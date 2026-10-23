// Top bar: change count (opens the list), Undo, Redo, Preview, and Save draft and Publish (not set up yet).
import type { RecordChange } from "../editor/changeset.ts";
import { useEditor } from "./context.tsx";
import { Icon } from "./Menu.tsx";

interface Props {
  changes: RecordChange[];
  autosave: "on" | "off";
  onShowChanges: () => void;
  onPreview: () => void;
}

const mod = /Mac|iPhone|iPad/.test(typeof navigator === "undefined" ? "" : navigator.platform) ? "Cmd" : "Ctrl";

export function TopBar({ changes, autosave, onShowChanges, onPreview }: Props) {
  const { state, dispatch, session } = useEditor();
  const brand = state.base.brand;
  return (
    <header className="admin-top">
      <div className="admin-top-brand">
        <strong>{brand.shortName}</strong>
        <span className="small">Editor</span>
      </div>
      <button type="button" className="btn btn-text btn-sm change-count" onClick={onShowChanges}>
        <span className="count-dot" data-zero={changes.length === 0 || undefined}>{changes.length}</span>
        {changes.length === 1 ? "change" : "changes"}
        <span className="visually-hidden">. Show unsaved changes</span>
      </button>
      <div className="row">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: "undo" })} disabled={!state.past.length} aria-keyshortcuts={`${mod === "Cmd" ? "Meta" : "Control"}+Z`} title={`Undo (${mod}+Z)`}>
          Undo
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: "redo" })} disabled={!state.future.length} aria-keyshortcuts={`${mod === "Cmd" ? "Meta" : "Control"}+Shift+Z`} title={`Redo (Shift+${mod}+Z)`}>
          Redo
        </button>
      </div>
      <div className="row admin-top-actions">
        {autosave === "off" && <span className="small">Changes are not kept if you close this tab.</span>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onPreview}>
          <Icon name="search" /> Preview
        </button>
        <span className="visually-hidden" id="saving-note">Saving is not set up yet.</span>
        <button type="button" className="btn btn-secondary btn-sm" aria-disabled="true" aria-describedby="saving-note" title="Saving is not set up yet.">
          Save draft
        </button>
        <button type="button" className="btn btn-primary btn-sm" aria-disabled="true" aria-describedby="saving-note" title="Publishing is not set up yet.">
          Publish
        </button>
        <span className="small admin-session">{session.name}</span>
      </div>
    </header>
  );
}
