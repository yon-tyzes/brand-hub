// The editor's Overview (EditorHome.dc.html, ENGINE_SPEC.md section 8): add to the brand, what is ready to
// publish, what waits on a decision, and the recent changes.
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { RecordChange } from "../editor/changeset.ts";
import { EDITOR_MODULES, moduleForType } from "../editor/modules.ts";
import { useEditor } from "./context.tsx";
import { Icon } from "./Menu.tsx";

const ADD: Record<string, { title: string; help: string }> = {
  logos: { title: "Add logos", help: "Drop SVG or PNG files." },
  colors: { title: "Add a color", help: "Start from a HEX value." },
  icons: { title: "Add icons", help: "Drop SVG files." },
  fonts: { title: "Add a font", help: "Drop the files of one family." },
  templates: { title: "Add a template", help: "Drop a thumbnail and its files." },
  rules: { title: "Add a rule", help: "Write what to do and what to avoid." },
  photos: { title: "Add a photo library", help: "Paste the link to the folder." },
};
const ADD_ORDER = ["logos", "colors", "icons", "fonts", "templates", "rules", "photos"];

const TYPE_ICON: Partial<Record<AnyRecord["type"], string>> = {
  logo: "logo", font: "type", icon: "grid", template: "layout", "photo-source": "image", rule: "book",
};

const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const day = (iso: string) => shortDate.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));

function Thumb({ record }: { record?: AnyRecord }) {
  if (record?.type === "color") return <span className="ov-thumb" style={{ background: record.hex }} aria-hidden="true" />;
  return (
    <span className="ov-thumb ov-thumb-icon" aria-hidden="true">
      <Icon name={(record && TYPE_ICON[record.type]) ?? "layout"} size={16} />
    </span>
  );
}

interface Props {
  changes: RecordChange[];
  /** A saved draft that is not published yet. */
  unpublished: boolean;
  busy: boolean;
  onReview: (id: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onHistory: () => void;
}

export function Overview({ changes, unpublished, busy, onReview, onPreview, onPublish, onHistory }: Props) {
  const { state, records, go, addFiles } = useEditor();
  const live = state.base.records.filter((r) => r.status === "locked").length;
  const log = [...state.base.changelog].sort((a, b) => b.date.localeCompare(a.date));
  const last = log[0];
  const byId = new Map([...state.base.records, ...records].map((r) => [r.id, r]));
  const pending = records.filter((r) => r.status === "pending");
  const n = changes.length;

  return (
    <div className="ed-page">
      <div>
        <h1 className="ed-title">Overview</h1>
        <p className="ed-intro">
          {live} {live === 1 ? "item is" : "items are"} live on the site.{" "}
          {last ? `Last published ${day(last.date)} by ${last.author}.` : "Nothing is published yet."}
        </p>
      </div>

      <section aria-labelledby="ov-add">
        <h2 className="ov-h2" id="ov-add">Add to the brand</h2>
        <ul className="ov-tiles" role="list">
          {ADD_ORDER.map((id) => EDITOR_MODULES.find((m) => m.id === id)!).map((m) => (
            <li key={m.id}>
              <a
                className="ov-tile"
                href={`/admin/${m.id}/`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  go(m.id);
                }}
                onDragOver={(e) => m.accept.length && [...e.dataTransfer.types].includes("Files") && e.preventDefault()}
                onDrop={(e) => {
                  if (!e.dataTransfer.files.length || !m.accept.length) return;
                  e.preventDefault();
                  go(m.id);
                  addFiles([...e.dataTransfer.files], m.id);
                }}
              >
                <span className="ov-tile-icon" aria-hidden="true"><Icon name="plus" size={16} /></span>
                <span className="ov-tile-title">{ADD[m.id]!.title}</span>
                <span className="ov-tile-help">{ADD[m.id]!.help}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="ov-pair">
        <section className="ov-panel" id="ready" aria-labelledby="ov-ready">
          <div className="ov-panel-head">
            <h2 id="ov-ready">Ready to publish</h2>
            {n > 0 ? <span>Not saved yet</span> : unpublished ? <span>Saved as a draft</span> : null}
          </div>
          {n === 0 ? (
            <p className="ov-empty">{unpublished ? "Your saved draft is ready to publish." : "Nothing to publish. Changes you make show up here."}</p>
          ) : (
            <ul className="ov-rows" role="list">
              {changes.map((c) => {
                const order = c.id.startsWith("order:");
                const r = order ? undefined : byId.get(c.id);
                const [name, what] = order ? [c.line.split(":")[0]!, "Order changed"] : [r?.label ?? c.id, c.line.replace(/^[^:]*:\s*/, "")];
                return (
                  <li key={c.id}>
                    <Thumb record={r} />
                    <span className="ov-row-text">
                      <span className="ov-row-title">{name}</span>
                      <span className="ov-row-help">{what.charAt(0).toUpperCase() + what.slice(1)}</span>
                    </span>
                    {(order || (r && c.kind !== "deleted")) && (
                      <button
                        type="button"
                        className="ov-link"
                        onClick={() => (order ? go(moduleForTypeName(c.id.slice(6))) : onReview(c.id))}
                      >
                        Review<span className="visually-hidden"> {name}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="ov-actions">
            <button type="button" className="btn btn-secondary" onClick={onPreview}>Preview changes</button>
            <button type="button" className="btn btn-primary" onClick={onPublish} disabled={busy || (!n && !unpublished)}>
              {n ? `Publish ${n} ${n === 1 ? "change" : "changes"}` : "Publish"}
            </button>
          </div>
        </section>

        <section className="ov-panel" aria-labelledby="ov-waiting">
          <div className="ov-panel-head">
            <h2 id="ov-waiting">Waiting on a decision</h2>
          </div>
          {pending.length === 0 ? (
            <p className="ov-empty">Nothing is waiting. Items set to Pending show up here.</p>
          ) : (
            <ul className="ov-rows" role="list">
              {pending.map((r) => (
                <li key={r.id}>
                  <Thumb record={r} />
                  <span className="ov-row-text">
                    <span className="ov-row-title">{r.label} is pending</span>
                    <span className="ov-row-help">It isn't on the site yet. Set it to Live when it's approved.</span>
                  </span>
                  <button type="button" className="ov-link" onClick={() => onReview(r.id)}>
                    Open<span className="visually-hidden"> {r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="ov-recent">
        <div className="ov-section-head">
          <h2 className="ov-h2" id="ov-recent">Recent changes</h2>
          <button type="button" className="ov-link" onClick={onHistory}>Full history</button>
        </div>
        {log.length === 0 ? (
          <p className="ov-empty">No changes published yet.</p>
        ) : (
          <ul className="ov-log" role="list">
            {log.slice(0, 6).map((e) => (
              <li key={`${e.date}-${e.assetId}-${e.summary}`}>
                <time dateTime={e.date}>{day(e.date)}</time>
                <span>{e.summary}</span>
                <span className="ov-log-by">{e.author}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** "order:logo" names a module by record type. */
const moduleForTypeName = (type: string) => moduleForType(type as AnyRecord["type"]).id;
