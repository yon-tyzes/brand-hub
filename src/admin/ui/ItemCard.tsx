// One item in the editor grid: the public preview, its name (rename inline), status, and an actions menu.
// Drag the card to reorder; drop a file on it to replace its file.
import { useRef, useState } from "react";
import type { AnyRecord } from "../../../schemas/asset.ts";
import { AssetPreview } from "../../components/previews/AssetPreview.tsx";
import { STATUS_LABEL } from "../editor/modules.ts";
import { moveBy, setStatus, updateRecord } from "../editor/state.ts";
import { validate } from "../editor/validate.ts";
import { useEditor } from "./context.tsx";
import { Menu } from "./Menu.tsx";

export const CARD_DRAG_TYPE = "application/x-brand-hub-item";
const REPLACEABLE = new Set(["logo", "icon", "template"]);

interface Props {
  record: AnyRecord;
  index: number;
  count: number;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onReorder: (draggedId: string, targetId: string, after: boolean) => void;
}

export function ItemCard({ record: r, index, count, checked, onCheck, onReorder }: Props) {
  const { apply, selectedId, urlFor, svgFor, replaceFile, retireItems, module, issuesFor, edit } = useEditor();
  const [renaming, setRenaming] = useState(false);
  const [dropHint, setDropHint] = useState<"" | "file" | "before" | "after">("");
  const picker = useRef<HTMLInputElement>(null);
  const errors = Object.keys(validate(r)).length > 0 || issuesFor(r.id).length > 0;

  const save = (value: string) => {
    const label = value.trim();
    setRenaming(false);
    if (label && label !== r.label) apply(updateRecord(r.id, { label }));
  };

  const side = (e: React.DragEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientX > box.left + box.width / 2 ? "after" : "before";
  };

  return (
    <li
      className="admin-card"
      data-id={r.id}
      data-selected={selectedId === r.id || undefined}
      data-drop={dropHint || undefined}
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData(CARD_DRAG_TYPE, r.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        const types = [...e.dataTransfer.types];
        if (types.includes("Files") && REPLACEABLE.has(r.type)) {
          e.preventDefault();
          e.stopPropagation();
          setDropHint("file");
        } else if (types.includes(CARD_DRAG_TYPE)) {
          e.preventDefault();
          setDropHint(side(e));
        }
      }}
      onDragLeave={() => setDropHint("")}
      onDrop={(e) => {
        const hint = dropHint;
        setDropHint("");
        const file = e.dataTransfer.files[0];
        if (file && REPLACEABLE.has(r.type)) {
          e.preventDefault();
          e.stopPropagation();
          return replaceFile(r.id, file);
        }
        const dragged = e.dataTransfer.getData(CARD_DRAG_TYPE);
        if (dragged && dragged !== r.id) {
          e.preventDefault();
          onReorder(dragged, r.id, hint === "after");
        }
      }}
    >
      <div className="admin-card-top">
        <label className="admin-check">
          <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
          <span className="visually-hidden">Select {r.label}</span>
        </label>
        <span className={`status-badge status-${r.status}`}>{STATUS_LABEL[r.status]}</span>
        {errors && <span className="status-badge status-attention">Needs details</span>}
      </div>
      <button className="admin-card-preview" type="button" tabIndex={-1} aria-hidden="true" onClick={() => edit(r.id)}>
        <AssetPreview record={r} urlFor={urlFor} svgFor={svgFor} alt="" />
      </button>
      <div className="admin-card-name">
        {renaming ? (
          <input
            className="field field-sm"
            aria-label={`Name for ${r.label}`}
            defaultValue={r.label}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") save(e.currentTarget.value);
              if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), setRenaming(false));
            }}
            onBlur={(e) => renaming && save(e.currentTarget.value)}
          />
        ) : (
          <button type="button" className="admin-card-title" onClick={() => edit(r.id)} onDoubleClick={() => setRenaming(true)} aria-label={`Edit ${r.label}`}>
            {r.label}
          </button>
        )}
        <Menu
          label={`More actions for ${r.label}`}
          buttonProps={{ "data-card-menu": r.id }}
          items={[
            { label: "Rename", run: () => setRenaming(true) },
            { label: "Move up", run: () => apply(moveBy(r.id, -1)), disabled: index === 0 },
            { label: "Move down", run: () => apply(moveBy(r.id, 1)), disabled: index === count - 1 },
            ...(REPLACEABLE.has(r.type) ? [{ label: "Replace file", run: () => picker.current?.click() }] : []),
            r.status === "retired"
              ? { label: "Restore as draft", run: () => apply(setStatus([r.id], "draft")) }
              : { label: "Retire", run: () => retireItems([r.id]) },
          ]}
        />
      </div>
      <input
        ref={picker}
        type="file"
        hidden
        accept={module.accept.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) replaceFile(r.id, file);
          e.target.value = "";
        }}
      />
    </li>
  );
}
