// Search dialog (SearchOpen.dc.html, SearchMobile.dc.html; DESIGN_SYSTEM.md, SearchField). Loads the
// build-time MiniSearch index on first open. Results are grouped by type and carry inline actions.
// Keys: Up and Down move between results, Enter runs the first action, Escape closes and returns focus.
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

function Thumb({ hit: h }: { hit: Hit }) {
  if (h.swatch) return <span className="result-thumb" style={{ background: h.swatch }} aria-hidden="true" />;
  if (h.image) {
    return (
      <span className="result-thumb result-thumb-image" style={h.ground ? { background: h.ground } : undefined} aria-hidden="true">
        <img src={h.image} alt="" loading="lazy" />
      </span>
    );
  }
  return <Svg className="result-thumb result-thumb-icon" markup={h.svg ?? uiIconSvg(h.type === "rule" ? "book" : "arrow-right", 18)} />;
}

/** Results whose only action opens a page are links; the rest show their actions inline. */
const isLink = (h: Hit) => h.actions.length > 0 && h.actions.every((a) => a.kind === "open");

export function SearchDialog({ register }: { register: (api: SearchApi) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

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
  // Results in the order they are drawn, so arrows and the highlight follow the groups.
  const ordered = useMemo(() => groups.flatMap(([, items]) => items), [groups]);
  useEffect(() => setActive(0), [query]);

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
      run(ordered[active]?.actions[0]);
    }
  }

  const count = `${hits.length} ${hits.length === 1 ? "result" : "results"}`;
  const status = !query.trim() ? "" : !index ? (failed ? "Search could not load. Reload the page and try again." : "Loading search") : count;

  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-label="Search the brand"
      onKeyDown={onKeyDown}
      onClose={() => opener.current?.focus()}
      onClick={(e) => e.target === dialog.current && close()}
    >
      <div className="search-head">
        <div className="search-input-row">
          <Svg markup={uiIconSvg("search", 20)} />
          <input
            ref={input}
            className="search-input"
            type="search"
            placeholder="Search the brand"
            aria-label="Search the brand"
            aria-describedby="search-status"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-esc" type="button" onClick={close} aria-label="Close search">Esc</button>
        </div>
        <button className="search-cancel" type="button" onClick={close}>Cancel</button>
      </div>
      <p id="search-status" className="visually-hidden" role="status">{status}</p>
      {query.trim() !== "" && (
        <div className="search-results">
          {index && hits.length === 0 && <p className="search-empty">No results for “{query.trim()}”.</p>}
          {failed && <p className="search-empty">{status}</p>}
          {groups.map(([group, items]) => (
            <section className="search-group" key={group} aria-label={group}>
              <p className="search-group-label" aria-hidden="true">{group}</p>
              <ul role="list">
                {items.map((h) => {
                  const n = ordered.indexOf(h);
                  const link = isLink(h);
                  const first = h.actions[0];
                  const body = (
                    <>
                      <Thumb hit={h} />
                      <span className="search-result-text">
                        <span className="search-result-label">{h.label}</span>
                        {h.help && <span className="search-result-help">{h.help}</span>}
                      </span>
                      {link && <Svg className="search-result-arrow" markup={uiIconSvg("arrow-right", 16)} />}
                    </>
                  );
                  return (
                    <li className={n === active ? "search-result is-active" : "search-result"} key={h.id}>
                      {link && first?.kind === "open" ? (
                        <a className="search-result-main" href={first.href} data-result-main onFocus={() => setActive(n)} onClick={(e) => { e.preventDefault(); run(first); }}>
                          {body}
                        </a>
                      ) : (
                        <button className="search-result-main" type="button" data-result-main onFocus={() => setActive(n)} onClick={() => run(first)}
                          aria-label={first ? `${h.label}: ${first.kind === "copy" ? `copy ${first.label}` : first.label}` : h.label}>
                          {body}
                        </button>
                      )}
                      {!link && h.actions.length > 0 && (
                        <span className={h.type === "color" ? "search-result-actions is-values" : "search-result-actions"}>
                          {h.actions.filter((a) => a.kind !== "open").slice(0, 3).map((a, i) => (
                            <button
                              key={a.label}
                              className={["btn btn-sm", i === 0 && a.kind === "copy" ? "btn-primary" : "btn-secondary", a.kind === "copy" && a.value ? "btn-value" : ""].join(" ")}
                              type="button"
                              onClick={() => run(a)}
                              aria-label={`${a.kind === "copy" ? "Copy" : "Download"} ${a.label}: ${h.label}`}
                            >
                              {i === 0 && a.kind === "copy" && <Svg markup={uiIconSvg("copy", 16)} />}
                              {a.kind === "copy" && i === 0 && <span className="label-short">Copy&nbsp;</span>}
                              {a.label}
                            </button>
                          ))}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {query.trim() !== "" && index && hits.length > 0 && (
        <div className="search-foot" aria-hidden="true">
          <span><kbd>↑↓</kbd>Move</span>
          <span><kbd>Enter</kbd>Copy or download</span>
          <span className="search-foot-count">{count}</span>
        </div>
      )}
    </dialog>
  );
}
