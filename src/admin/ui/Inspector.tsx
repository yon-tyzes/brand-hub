// Right panel: every field of the selected item, generated from the section's field config, with status
// and permanent delete. Validation runs on each change.
import { useState } from "react";
import type { Status } from "../../../schemas/asset.ts";
import { FIELDS } from "../fields/index.ts";
import { moduleForType, STATUS_LABEL } from "../editor/modules.ts";
import { deleteRecord, restoreRecord, setStatus, updateRecord } from "../editor/state.ts";
import { validate } from "../editor/validate.ts";
import { useEditor } from "./context.tsx";
import { Field } from "./Fields.tsx";
import { Modal } from "./Modal.tsx";

const STATUSES: { value: Exclude<Status, "retired">; help: string }[] = [
  { value: "draft", help: "Only in the editor." },
  { value: "pending", help: "Listed as in progress on What's new." },
  { value: "locked", help: "On the site after you publish." },
];

/** In a sheet, the sheet supplies the title and close button. */
export function Inspector({ inSheet = false }: { inSheet?: boolean }) {
  const { records, selectedId, select, apply, toast, issuesFor } = useEditor();
  const [confirming, setConfirming] = useState(false);
  const record = records.find((r) => r.id === selectedId);
  if (!record) {
    return (
      <div className="inspector-empty">
        <p className="small">Select an item to edit its details.</p>
      </div>
    );
  }
  const mod = moduleForType(record.type);
  const errors = validate(record);
  const nameError = errors.label;

  return (
    <div className={inSheet ? "inspector inspector-in-sheet" : "inspector"} key={record.id}>
      {!inSheet && (
        <div className="inspector-head">
          <h2 className="h4">{record.label}</h2>
          <button type="button" className="btn btn-text btn-sm" onClick={() => select(null)}>
            Close<span className="visually-hidden"> details</span>
          </button>
        </div>
      )}

      {issuesFor(record.id).length > 0 && (
        <div className="ed-issues" role="alert">
          <p className="ed-label">Fix before saving</p>
          <ul>{issuesFor(record.id).map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {record.status === "retired" ? (
        <div className="ed-retired" role="status">
          <p>This {mod.noun} is retired. It leaves the site when you publish.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => apply(setStatus([record.id], "draft"))}>
            Restore as draft
          </button>
        </div>
      ) : (
        <fieldset className="ed-field">
          <legend className="ed-label">Status</legend>
          <div className="segmented" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => (
              <label key={s.value}>
                <input type="radio" name={`status-${record.id}`} value={s.value} checked={record.status === s.value} onChange={() => apply(setStatus([record.id], s.value))} />
                <span>{STATUS_LABEL[s.value]}</span>
              </label>
            ))}
          </div>
          <p className="ed-help">{STATUSES.find((s) => s.value === record.status)?.help}</p>
        </fieldset>
      )}

      <div className="ed-field" data-invalid={nameError ? true : undefined}>
        <label className="ed-label" htmlFor="ed-name">Name</label>
        <p className="ed-help" id="ed-name-help">Shown on the card and in search.</p>
        <input
          id="ed-name"
          className="field"
          value={record.label}
          aria-describedby={`ed-name-help${nameError ? " ed-name-error" : ""}`}
          aria-invalid={nameError ? true : undefined}
          onChange={(e) => apply(updateRecord(record.id, { label: e.target.value }), `${record.id}.label`)}
        />
        {nameError && <p className="ed-error" id="ed-name-error">{nameError}</p>}
      </div>

      {FIELDS[mod.id]!.map((def) => (
        <Field key={`${def.key}-${def.kind}`} def={def} record={record} error={errors[def.key]} />
      ))}

      <div className="ed-danger">
        <button type="button" className="btn btn-text btn-sm" onClick={() => setConfirming(true)}>
          Delete permanently
        </button>
      </div>

      {confirming && (
        <Modal
          title={`Delete ${record.label} permanently?`}
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const index = records.indexOf(record);
                  setConfirming(false);
                  select(null);
                  apply(deleteRecord(record.id));
                  toast({ message: `${record.label} deleted.`, action: { label: "Undo", run: () => apply(restoreRecord(record, index)) } });
                }}
              >
                Delete {record.label}
              </button>
            </>
          }
        >
          <p>
            {record.label} and its files are removed from the site and from the brand files when you publish. To keep it but hide it, retire it instead.
          </p>
        </Modal>
      )}
    </div>
  );
}
