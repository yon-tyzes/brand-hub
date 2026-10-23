// Center panel: the current section's items. Drop files to add, drag cards to reorder, check cards for
// bulk actions. Add opens a file picker for sections that need a file, otherwise creates a blank item.
import { useRef, useState } from "react";
import type { Status } from "../../../schemas/asset.ts";
import { newRecord, STATUS_LABEL } from "../editor/modules.ts";
import { addRecord, ordered, reorder, setStatus } from "../editor/state.ts";
import { useEditor } from "./context.tsx";
import { CARD_DRAG_TYPE, ItemCard } from "./ItemCard.tsx";
import { Icon } from "./Menu.tsx";

/** Sections whose items always need a file to start with. */
const FILE_FIRST = new Set(["logos", "icons", "fonts"]);

export type StatusFilter = "all" | Status;

const DROP_HINT: Record<string, string> = {
  logos: "Drop logo files here to add them, or drop a file on a card to replace it.",
  icons: "Drop SVG icons here to add them, or drop a file on a card to replace it.",
  fonts: "Drop the font files of one family here to add it.",
  colors: "Drop an SVG here to add the colors it uses, or press Add.",
  templates: "Drop thumbnail images here to add templates, or drop one on a card to replace it.",
};

export function Grid({ filter }: { filter: StatusFilter }) {
  const { module: mod, records, apply, select, addFiles, retireItems, toast } = useEditor();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dropping, setDropping] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const all = ordered(records, mod.type);
  const shown = all.filter((r) => filter === "all" || r.status === filter);
  const selected = [...checked].filter((id) => shown.some((r) => r.id === id));

  function add() {
    if (FILE_FIRST.has(mod.id)) return picker.current?.click();
    const label = `New ${mod.noun}`;
    const rec = newRecord(mod, label, new Set(records.map((r) => r.id)));
    apply(addRecord(rec));
    select(rec.id);
    toast({ message: `Added ${label.toLowerCase()}. Fill in its details on the right.` });
  }

  function onReorder(dragged: string, target: string, after: boolean) {
    const ids = all.map((r) => r.id).filter((id) => id !== dragged);
    const at = ids.indexOf(target) + (after ? 1 : 0);
    ids.splice(at, 0, dragged);
    apply(reorder(mod.type, ids));
  }

  const bulkStatus = (status: Status) => {
    apply(setStatus(selected, status));
    toast({ message: `${selected.length} ${selected.length === 1 ? "item" : "items"} set to ${STATUS_LABEL[status]}.` });
  };

  return (
    <section
      className="admin-grid-panel"
      aria-labelledby="section-title"
      data-dropping={dropping || undefined}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes("Files")) {
          e.preventDefault();
          setDropping(true);
        } else if ([...e.dataTransfer.types].includes(CARD_DRAG_TYPE)) e.preventDefault();
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropping(false)}
      onDrop={(e) => {
        setDropping(false);
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        addFiles([...e.dataTransfer.files]);
      }}
    >
      <div className="admin-grid-head">
        <div>
          <h1 id="section-title" className="h3">{mod.label}</h1>
          <p className="small">
            {DROP_HINT[mod.id] ?? `Press Add to create a ${mod.noun}.`}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
          <Icon name="plus" /> Add {mod.noun}
        </button>
        <input
          ref={picker}
          type="file"
          hidden
          multiple
          accept={mod.accept.join(",")}
          aria-label={`Choose files to add as ${mod.label.toLowerCase()}`}
          data-add-input={mod.id}
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Selected items">
          <span>{selected.length} selected</span>
          <span className="row">
            {(["draft", "pending", "locked"] as const).map((s) => (
              <button key={s} type="button" className="btn btn-secondary btn-sm" onClick={() => bulkStatus(s)}>
                Set to {STATUS_LABEL[s]}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                retireItems(selected);
                setChecked(new Set());
              }}
            >
              Retire
            </button>
            <button type="button" className="btn btn-text btn-sm" onClick={() => setChecked(new Set())}>
              Clear selection
            </button>
          </span>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="admin-empty">{filter === "all" ? `No ${mod.label.toLowerCase()} yet.` : `No ${mod.label.toLowerCase()} with status ${STATUS_LABEL[filter]}.`}</p>
      ) : (
        <ul className="admin-cards" role="list" aria-label={mod.label}>
          {shown.map((r) => (
            <ItemCard
              key={r.id}
              record={r}
              index={all.indexOf(r)}
              count={all.length}
              checked={checked.has(r.id)}
              onCheck={(on) =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(r.id);
                  else next.delete(r.id);
                  return next;
                })
              }
              onReorder={onReorder}
            />
          ))}
        </ul>
      )}
      {dropping && <div className="drop-overlay" aria-hidden="true">Drop to add {mod.label.toLowerCase()}</div>}
    </section>
  );
}
