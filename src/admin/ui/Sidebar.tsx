// Editor sidebar (EditorHome.dc.html): Overview, each module with its item count, Brand settings, History,
// and the signed-in person with Sign out. Dropping files on a module adds them there.
import { EDITOR_MODULES, SETTINGS, type EditorView } from "../editor/modules.ts";
import { useEditor } from "./context.tsx";
import { Icon } from "./Menu.tsx";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Sidebar({ onHistory, onSignOut }: { onHistory: () => void; onSignOut: () => void }) {
  const { records, view, go, addFiles, session } = useEditor();
  const link = (target: EditorView, label: React.ReactNode, extra?: React.ReactNode, props: React.AnchorHTMLAttributes<HTMLAnchorElement> = {}) => (
    <a
      className="ed-side-item"
      href={target === "overview" ? "/admin/" : `/admin/${target}/`}
      aria-current={view === target ? "page" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(target);
      }}
      {...props}
    >
      {label}
      {extra}
    </a>
  );
  return (
    <nav className="ed-side" aria-label="Editor">
      <ul role="list">
        <li>{link("overview", <><Icon name="overview" size={18} />Overview</>)}</li>
      </ul>
      <hr />
      <ul role="list" aria-label="Sections">
        {EDITOR_MODULES.map((m) => {
          const count = records.filter((r) => r.type === m.type).length;
          return (
            <li key={m.id}>
              {link(m.id, m.label, <span className="ed-side-count" aria-label={`${count} items`}>{count}</span>, {
                onDragOver: (e) => m.accept.length && [...e.dataTransfer.types].includes("Files") && e.preventDefault(),
                onDrop: (e) => {
                  if (!e.dataTransfer.files.length || !m.accept.length) return;
                  e.preventDefault();
                  go(m.id);
                  addFiles([...e.dataTransfer.files], m.id);
                },
              })}
            </li>
          );
        })}
      </ul>
      <hr />
      <ul role="list">
        <li>{link(SETTINGS, "Brand settings")}</li>
        <li>
          <button type="button" className="ed-side-item" onClick={onHistory}>History</button>
        </li>
      </ul>
      <div className="ed-side-person">
        <span className="ed-avatar" aria-hidden="true">{initials(session.name)}</span>
        <span>
          <span className="ed-person-name">{session.name}</span>
          <button type="button" className="ed-signout" onClick={onSignOut}>Sign out</button>
        </span>
      </div>
    </nav>
  );
}
