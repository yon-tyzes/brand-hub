// Dialogs: replace a file (old and new side by side), preview a section as the site shows it, and list changes.
import { useEffect, useMemo } from "react";
import type { AnyRecord } from "../../../schemas/asset.ts";
import { AssetPreview } from "../../components/previews/AssetPreview.tsx";
import type { RecordChange } from "../editor/changeset.ts";
import type { Upload } from "../editor/ingest.ts";
import { ordered } from "../editor/state.ts";
import { useEditor } from "./context.tsx";
import { Modal } from "./Modal.tsx";

export function ReplaceDialog({ record, next, upload, onConfirm, onClose }: { record: AnyRecord; next: AnyRecord; upload: Upload; onConfirm: () => void; onClose: () => void }) {
  const { urlFor, svgFor } = useEditor();
  const newUrl = useMemo(() => URL.createObjectURL(upload.blob), [upload]);
  useEffect(() => () => URL.revokeObjectURL(newUrl), [newUrl]);
  const nextUrl = (p: string) => (p === upload.path ? newUrl : urlFor(p));
  return (
    <Modal
      title={`Replace the file for ${record.label}?`}
      onClose={onClose}
      wide
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm}>Replace file</button>
        </>
      }
    >
      <div className="compare">
        <figure>
          <div className="card-preview"><AssetPreview record={record} urlFor={urlFor} svgFor={svgFor} alt="Current file" /></div>
          <figcaption className="small">Now</figcaption>
        </figure>
        <figure>
          <div className="card-preview"><AssetPreview record={next} urlFor={nextUrl} alt="New file" /></div>
          <figcaption className="small">New: {upload.name}{upload.width ? `, ${upload.width} by ${upload.height} px` : ""}</figcaption>
        </figure>
      </div>
      {upload.notes.length > 0 && (
        <div className="ed-notes">
          <p className="small">We cleaned the new file:</p>
          <ul>{upload.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
    </Modal>
  );
}

export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const { module, records, urlFor, svgFor } = useEditor();
  const live = ordered(records, module.type).filter((r) => r.status === "locked");
  return (
    <Modal title={`Preview: ${module.label} as the site will show them`} onClose={onClose} wide actions={<button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close preview</button>}>
      <p className="small">Only Live items appear on the site. This shows your changes, before saving.</p>
      {live.length === 0 ? (
        <p>No live {module.label.toLowerCase()}.</p>
      ) : (
        <ul className="grid cards-3 preview-grid" role="list">
          {live.map((r) => (
            <li key={r.id} className="card">
              <div className="card-preview"><AssetPreview record={r} urlFor={urlFor} svgFor={svgFor} /></div>
              <h3 className="card-title">{r.type === "rule" ? (r as { title: string }).title : r.label}</h3>
              {r.help && <p className="card-description">{r.help}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export function ChangesDialog({ changes, onClose }: { changes: RecordChange[]; onClose: () => void }) {
  return (
    <Modal title="Unsaved changes" onClose={onClose} actions={<button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>}>
      {changes.length === 0 ? <p>No changes yet.</p> : <ul className="changes-list">{changes.map((c) => <li key={c.id}>{c.line}</li>)}</ul>}
    </Modal>
  );
}
