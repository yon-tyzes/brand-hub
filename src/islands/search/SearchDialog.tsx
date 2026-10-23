// Search dialog (docs/DESIGN_SYSTEM.md, "Search dialog"). Loads the build-time MiniSearch index on first open.
// Keys: type to search, Down moves into results, Up and Down move between results, Enter runs the
// default action (first action), Escape closes and returns focus to the opener.
import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import { copyText } from "../../scripts/client.ts";
import { SEARCH_INDEX_URL, searchOptions, type SearchAction, type SearchDoc } from "../../lib/search-config.ts";
import { uiIconSvg } from "../../lib/ui-icons.ts";

type Hit = SearchResult & Omit<SearchDoc, "id">;

export interface SearchApi {
  /** `query` carries keys typed before the dialog loaded. */
  open(opener: HTMLElement | null, query?: string): void;
}

let indexPromise: Promise<MiniSearch<SearchDoc>> | undefined;
function loadIndex() {
  indexPromise ??= fetch(SEARCH_INDEX_URL)
    .then((r) => r.json())
    .then((data: { index: object }) => MiniSearch.loadJS<SearchDoc>(data.index as never, searchOptions));
  return indexPromise;
}

function runAction(action: SearchAction) {
  if (action.kind === "copy") return void copyText(action.text, action.message);
  if (action.kind === "download") {
    const a = Object.assign(document.createElement("a"), { href: action.href, download: action.filename });
    document.body.append(a);
    a.click();
    a.remove();
    return;
  }
  if (action.external) window.open(action.href, "_blank", "noopener");
  else window.location.assign(action.href);
}

const Svg = ({ markup, className }: { markup: string; className?: string }) => (
  <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
);

export function SearchDialog({ register }: { register: (api: SearchApi) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    register({
      open(from, typed) {
        opener.current = from;
        if (typed) setQuery(typed);
        if (!dialog.current?.open) dialog.current?.showModal();
        if (typed) input.current?.focus();
        else input.current?.select();
        loadIndex().then(setIndex, () => setFailed(true));
      },
    });
  }, [register]);

  const hits = useMemo<Hit[]>(() => (index && query.trim() ? (index.search(query.trim()) as Hit[]).slice(0, 30) : []), [index, query]);
  const groups = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) map.set(h.group, [...(map.get(h.group) ?? []), h]);
    return [...map];
  }, [hits]);

  const close = () => dialog.current?.close();
  const run = (action: SearchAction | undefined) => {
    if (!action) return;
    close();
    runAction(action);
  };
  const mains = () => [...(dialog.current?.querySelectorAll<HTMLElement>("[data-result-main]") ?? [])];

  function onKeyDown(e: React.KeyboardEvent) {
    // A search input with text would otherwise use the first Escape to clear itself.
    if (e.key === "Escape") {
      e.preventDefault();
      return close();
    }
    const list = mains();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (document.activeElement === input.current) {
        if (e.key === "ArrowDown") list[0]?.focus();
        return;
      }
      if (i < 0) return;
      const next = e.key === "ArrowDown" ? i + 1 : i - 1;
      if (next < 0) input.current?.focus();
      else list[Math.min(next, list.length - 1)]?.focus();
    }
    if (e.key === "Enter" && document.activeElement === input.current) {
      e.preventDefault();
      run(hits[0]?.actions[0]);
    }
  }

  const status = !query.trim()
    ? ""
    : !index
      ? failed ? "Search could not load. Reload the page and try again." : "Loading search"
      : `${hits.length} ${hits.length === 1 ? "result" : "results"}`;

  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-labelledby="search-title"
      onKeyDown={onKeyDown}
      onClose={() => opener.current?.focus()}
      onClick={(e) => e.target === dialog.current && close()}
    >
      <h2 id="search-title" className="visually-hidden">Search</h2>
      <div className="search-input-row">
        <Svg markup={uiIconSvg("search")} />
        <input
          ref={input}
          className="search-input"
          type="search"
          placeholder="Search assets and rules"
          aria-label="Search assets and rules"
          aria-describedby="search-status"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-text btn-sm" type="button" onClick={close}>
          Close <kbd className="kbd" aria-hidden="true">Esc</kbd>
        </button>
      </div>
      <p id="search-status" className="visually-hidden" role="status">{status}</p>
      {query.trim() !== "" && (
        <div className="search-results">
          {index && hits.length === 0 && <p className="search-empty">No results for “{query.trim()}”.</p>}
          {failed && <p className="search-empty">{status}</p>}
          {groups.map(([group, items]) => (
            <section className="search-group" key={group} aria-label={group}>
              <h3>{group}</h3>
              <ul role="list">
                {items.map((h) => {
                  const [first, ...more] = h.actions;
                  return (
                    <li className="search-result" key={h.id}>
                      <button className="search-result-main" type="button" data-result-main onClick={() => run(first)}>
                        {h.swatch ? (
                          <span className="swatch-dot" style={{ background: h.swatch }} aria-hidden="true" />
                        ) : h.image ? (
                          <img className="result-thumb" src={h.image} alt="" loading="lazy" data-bg={h.imageBg} />
                        ) : (
                          <Svg className="icon-tile icon-tile-sm" markup={h.svg ?? uiIconSvg(h.type === "rule" ? "book" : "arrow-right")} />
                        )}
                        <span>
                          <strong>{h.label}</strong>
                          <small>
                            {first ? `${first.label} · ` : ""}
                            {h.typeLabel}
                          </small>
                        </span>
                      </button>
                      <span className="search-result-actions">
                        {more.slice(0, 2).map((a) => (
                          <button key={a.label} className="btn btn-secondary btn-sm" type="button" onClick={() => run(a)} aria-label={`${a.label}: ${h.label}`}>
                            {a.label}
                          </button>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </dialog>
  );
}
