// Dialogs for saving: problems to fix, a failed save with Retry, a conflict with newer changes, and history.
import { useEffect, useState } from "react";
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { BrandContent } from "../../adapters/types.ts";
import { formatDate } from "../../site/data.ts";
import { describeChanges } from "../../serializer/index.ts";
import { moduleForType } from "../editor/modules.ts";
import { Modal } from "./Modal.tsx";

export function ProblemsDialog({ issues, records, base, onShow, onClose }: { issues: Map<string, string[]>; records: AnyRecord[]; base: AnyRecord[]; onShow: (id: string) => void; onClose: () => void }) {
  const byId = new Map([...base, ...records].map((r) => [r.id, r]));
  return (
    <Modal title="Fix these before saving" onClose={onClose} actions={<button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>}>
      <p className="small">Nothing was saved. Each item below needs a change.</p>
      <ul className="problems-list" role="list">
        {[...issues].map(([id, messages]) => {
          const r = byId.get(id);
          const live = records.some((x) => x.id === id);
          return (
            <li key={id || "general"}>
              <strong>{r ? `${moduleForType(r.type).noun.replace(/^./, (c) => c.toUpperCase())}: ${r.label}` : "The brand"}</strong>
              <ul>{messages.map((m) => <li key={m}>{m}</li>)}</ul>
              {r && live && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onShow(id)}>
                  Show {r.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

export function FailureDialog({ action, message, onRetry, onClose }: { action: "save" | "publish"; message: string; onRetry: () => void; onClose: () => void }) {
  return (
    <Modal
      title={action === "save" ? "Saving didn't work" : "Publishing didn't work"}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>Try again</button>
        </>
      }
    >
      <p>{message}</p>
      <p className="small">Your changes are still here.</p>
    </Modal>
  );
}

export function ConflictDialog({ base, remote, onReload, onOverwrite, onClose }: { base: BrandContent; remote: BrandContent; onReload: () => void; onOverwrite: () => void; onClose: () => void }) {
  const lines = describeChanges(base.records, remote.records).map((c) => c.line);
  return (
    <Modal
      title="Someone else changed the brand"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onOverwrite}>Overwrite with mine</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onReload}>Get their changes</button>
        </>
      }
    >
      <p>While you were editing, these items changed:</p>
      {lines.length ? <ul className="changes-list">{lines.map((l) => <li key={l}>{l}</li>)}</ul> : <p className="small">The changes were to brand settings.</p>}
      <p className="small">
        Get their changes keeps your edits and adds theirs, so you can check before saving. Overwrite with mine saves your version of every file you changed, replacing theirs.
      </p>
    </Modal>
  );
}

type Entry = { revision: string; date: string; author: string; summary: string[] };

export function HistoryDialog({ load, onRestore, onClose }: { load: () => Promise<Entry[]>; onRestore?: (e: Entry) => void; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    load().then(setEntries, () => setFailed(true));
  }, [load]);
  return (
    <Modal title="History" onClose={onClose} wide actions={<button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>}>
      {failed ? (
        <p>History could not load. Try again in a moment.</p>
      ) : !entries ? (
        <p role="status">Loading history</p>
      ) : entries.length === 0 ? (
        <p>No saved versions yet.</p>
      ) : (
        <ol className="history-list">
          {entries.map((e) => (
            <li key={`${e.revision}-${e.date}`}>
              <div>
                <strong><time dateTime={e.date}>{formatDate(e.date)}</time></strong> <span className="small">by {e.author}</span>
                <ul className="small">
                  {e.summary.slice(0, 4).map((s) => <li key={s}>{s}</li>)}
                  {e.summary.length > 4 && <li>and {e.summary.length - 4} more</li>}
                </ul>
              </div>
              {onRestore && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRestore(e)}>
                  Restore<span className="visually-hidden"> the version from {formatDate(e.date)}</span>
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
