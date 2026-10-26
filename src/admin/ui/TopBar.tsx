// Editor top bar (EditorColors.dc.html): brand mark and name with the Editor label, View site, the unsaved
// change count (opens the list), Undo, Redo, Preview, Save draft, and Publish, the one primary button.
import type { LogoAsset } from "../../../schemas/asset.ts";
import { fileUrl } from "../../lib/paths.ts";
import type { RecordChange } from "../editor/changeset.ts";
import { useEditor } from "./context.tsx";
import { Icon } from "./Menu.tsx";

interface Props {
  changes: RecordChange[];
  autosave: "on" | "off";
  busy: "saving" | "publishing" | null;
  onShowChanges: () => void;
  onPreview: () => void;
  onSave: () => void;
  onPublish: () => void;
}

const mod = /Mac|iPhone|iPad/.test(typeof navigator === "undefined" ? "" : navigator.platform) ? "Cmd" : "Ctrl";
const keys = (shift: boolean) => `${shift ? "Shift+" : ""}${mod === "Cmd" ? "Meta" : "Control"}+Z`;

export function TopBar({ changes, autosave, busy, onShowChanges, onPreview, onSave, onPublish }: Props) {
  const { state, dispatch, brand } = useEditor();
  const mark = state.present.records.find((r): r is LogoAsset => r.type === "logo" && r.status === "locked" && r.lockup.toLowerCase() === "mark" && r.background === "light");
  const markFile = mark && (mark.files.find((f) => f.ext === "svg") ?? mark.files.find((f) => f.ext === "png"));
  const n = changes.length;
  return (
    <header className="ed-top">
      <span className="ed-top-brand">
        {markFile && <img src={fileUrl(markFile.path)} alt="" width={26} height={26} />}
        <strong>{brand.shortName}</strong>
      </span>
      <span className="ed-tag">Editor</span>
      <a className="ed-view-site" href="/" target="_blank" rel="noopener">
        View site<Icon name="external" size={16} />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
      <div className="ed-top-actions">
        {autosave === "off" && <span className="small">Changes are not kept if you close this tab.</span>}
        <span role="status" className="small busy-note">{busy === "saving" ? "Saving" : busy === "publishing" ? "Publishing" : ""}</span>
        <button type="button" className="ed-changes" onClick={onShowChanges} data-zero={n === 0 || undefined}>
          <span className="ed-changes-dot" aria-hidden="true" />
          <span className="count-dot">{n}</span> unsaved {n === 1 ? "change" : "changes"}
          <span className="visually-hidden">. Show the list</span>
        </button>
        <button type="button" className="btn btn-secondary btn-icon ed-top-btn" onClick={() => dispatch({ type: "undo" })} disabled={!state.past.length} aria-label="Undo" aria-keyshortcuts={keys(false)} title={`Undo (${mod}+Z)`}>
          <Icon name="undo" size={18} />
        </button>
        <button type="button" className="btn btn-secondary btn-icon ed-top-btn" onClick={() => dispatch({ type: "redo" })} disabled={!state.future.length} aria-label="Redo" aria-keyshortcuts={keys(true)} title={`Redo (Shift+${mod}+Z)`}>
          <Icon name="redo" size={18} />
        </button>
        <button type="button" className="btn btn-secondary ed-top-btn" onClick={onPreview}>Preview</button>
        <button type="button" className="btn btn-secondary ed-top-btn" onClick={onSave} aria-busy={busy === "saving" || undefined}>Save draft</button>
        <button type="button" className="btn btn-primary ed-top-btn" onClick={onPublish} aria-busy={busy === "publishing" || undefined}>Publish</button>
      </div>
    </header>
  );
}
