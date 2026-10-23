// Left rail: sections with item counts, and the status filter.
import { EDITOR_MODULES, STATUS_LABEL } from "../editor/modules.ts";
import { useEditor } from "./context.tsx";
import type { StatusFilter } from "./Grid.tsx";

const FILTERS: StatusFilter[] = ["all", "draft", "pending", "locked", "retired"];

export function Rail({ filter, setFilter }: { filter: StatusFilter; setFilter: (f: StatusFilter) => void }) {
  const { records, module, setModule, addFiles } = useEditor();
  return (
    <nav className="admin-rail" aria-label="Sections">
      <ul role="list">
        {EDITOR_MODULES.map((m) => {
          const count = records.filter((r) => r.type === m.type && (filter === "all" || r.status === filter)).length;
          return (
            <li key={m.id}>
              <button
                type="button"
                className="rail-item"
                aria-current={m.id === module.id ? "page" : undefined}
                onClick={() => setModule(m.id)}
                onDragOver={(e) => m.accept.length && [...e.dataTransfer.types].includes("Files") && e.preventDefault()}
                onDrop={(e) => {
                  if (!e.dataTransfer.files.length || !m.accept.length) return;
                  e.preventDefault();
                  setModule(m.id);
                  addFiles([...e.dataTransfer.files], m.id);
                }}
              >
                <span>{m.label}</span>
                <span className="rail-count" aria-label={`${count} items`}>{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <fieldset className="rail-filter">
        <legend className="ed-label">Show</legend>
        {FILTERS.map((f) => (
          <label key={f}>
            <input type="radio" name="status-filter" value={f} checked={filter === f} onChange={() => setFilter(f)} />
            {f === "all" ? "All" : STATUS_LABEL[f]}
          </label>
        ))}
      </fieldset>
    </nav>
  );
}
