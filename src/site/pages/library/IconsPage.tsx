// Icons (Icons.dc.html, IconsMobile.dc.html): groups, a name filter, the brand's color pairs (an icon color on
// a ground), and the selected icon's panel with downloads. The grid sits on one panel filled with the pair's
// ground. On phones the detail panel docks to the bottom. src/scripts/icons.ts does the selecting, recoloring,
// filtering, and file export; without it every icon still shows, on the pair for the current theme.
import type { CSSProperties } from "react";
import type { IconAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { fileName } from "../../../lib/paths.ts";
import { chipText, defaultPairs, iconPairs, ruleStrip, type IconPair } from "../../library.ts";
import { Icon, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

/** What a query matches: the name, the id without a shared "icon-" prefix, and the keywords. */
const searchText = (i: IconAsset) => [i.label, i.id.replace(/^icon-/, ""), ...(i.keywords ?? [])].join(" ").toLowerCase();

export function IconsPage() {
  const site = useSite();
  const icons = site.assetsOfType("icon");
  const groups = [...new Set(icons.map((i) => i.group))];
  const pairs = iconPairs(site.assetsOfType("color"), site.brand.modules.icons);
  const defaults = defaultPairs(pairs);
  const first = defaults.light;
  const selected = icons[0];
  const svg = (i: IconAsset, size: number) => site.iconMarkup(i, size);
  const meta = (i: IconAsset) => [i.group, first?.label].filter(Boolean).join(" · ");
  // Both themes' default pairs; the stylesheet picks one until the viewer chooses (src/scripts/icons.ts).
  const vars = (theme: "light" | "dark", p: IconPair | undefined) =>
    p ? { [`--pair-${theme}-icon`]: p.icon.hex, [`--pair-${theme}-ground`]: p.ground.hex, [`--pair-${theme}-text`]: p.text } : {};
  return (
    <div
      className="library icons-page"
      data-icons-root=""
      data-pair-light={defaults.light?.id}
      data-pair-dark={defaults.dark?.id}
      style={{ ...vars("light", defaults.light), ...vars("dark", defaults.dark) } as CSSProperties}
    >
      <LibraryHead
        title={MODULES.icons.label}
        intro="Pick a color pair, then click an icon to download it. Use them at 16, 24, or 32 pixels, with a text label unless the meaning is universal."
        introShort="Pick a color pair, then tap an icon."
      />
      <RuleStrip strip={ruleStrip(site, "icons", icons)} />
      <div className="icon-toolbar">
        <label className="visually-hidden" htmlFor="icon-filter">Filter icons by name</label>
        <input id="icon-filter" type="search" placeholder="Filter by name" autoComplete="off" data-icon-filter="" />
        <button className="btn btn-ghost btn-sm" type="button" hidden data-icon-clear="">
          <Icon name="close" size={16} />
          Clear search
        </button>
        {pairs.length > 0 && (
          <div className="icon-colors" role="radiogroup" aria-label="Icon color">
            {pairs.map((p) => (
              <button
                key={p.id}
                className="chip pair-chip"
                type="button"
                role="radio"
                aria-checked={p === first}
                tabIndex={p === first ? 0 : -1}
                style={{ "--chip-ground": p.ground.hex, "--chip-ink": p.icon.hex, "--chip-text": chipText(p) } as CSSProperties}
                data-pair={p.id}
                data-icon-color={p.icon.hex}
                data-ground={p.ground.hex}
                data-label-color={p.text}
                data-color-id={p.icon.id}
                data-color-name={p.label}
              >
                <span className="pair-check" aria-hidden="true"><Icon name="check" size={16} /></span>
                {/* Text under 4.5:1 in the icon color takes shell text; a mark keeps the icon color on the chip. */}
                {chipText(p) !== p.icon.hex && <span className="pair-mark" aria-hidden="true" />}
                {p.label}
              </button>
            ))}
          </div>
        )}
        <span className="icon-count" role="status" data-icon-count="" data-total={icons.length}>{icons.length} of {icons.length} icons</span>
      </div>
      <div className="icon-layout">
        {/* The panel comes first so its downloads follow the color choice in tab order; CSS draws it on the right. */}
        {selected && (
          <aside className="icon-panel" aria-label="Selected icon" data-icon-panel="">
            <div className="icon-panel-preview" aria-hidden="true" data-icon-preview="" dangerouslySetInnerHTML={{ __html: svg(selected, 64) }} />
            <div className="icon-panel-body">
              <span className="icon-panel-thumb" aria-hidden="true" data-icon-thumb="" dangerouslySetInnerHTML={{ __html: svg(selected, 24) }} />
              <div className="icon-panel-text">
                <h2 className="icon-panel-name" data-icon-name-out="">{selected.label}</h2>
                <p className="icon-panel-meta" data-icon-meta="">{meta(selected)}</p>
              </div>
              <div className="icon-panel-actions">
                {/* "Download" with the format; the hidden name follows the selected icon. */}
                <button className="btn btn-primary" type="button" data-icon-download="svg">
                  <Icon name="download" size={16} />
                  Download<span className="visually-hidden"> <span data-icon-name-hidden="">{selected.label}</span> icon, </span>
                  <span className="btn-format">SVG</span>
                </button>
                <button className="btn btn-secondary" type="button" data-icon-download="png">
                  Download<span className="visually-hidden"> <span data-icon-name-hidden="">{selected.label}</span> icon, </span>
                  <span className="btn-format">PNG</span>
                </button>
              </div>
              <p className="icon-panel-source">{selected.source}</p>
            </div>
          </aside>
        )}
        <div className="icon-groups icon-board" data-icon-board="">
          <p className="icon-empty" hidden data-icon-empty="" />
          {groups.map((g) => (
            <section key={g} aria-labelledby={`icons-${g.toLowerCase().replace(/\W+/g, "-")}`} data-icon-group="">
              <h2 className="icon-group-title" id={`icons-${g.toLowerCase().replace(/\W+/g, "-")}`}>{g}</h2>
              <ul className="icon-grid" role="list">
                {icons.filter((i) => i.group === g).map((i) => (
                  <li key={i.id} id={i.id} data-icon-item="" data-text={searchText(i)}>
                    <button className="icon-tile-btn" type="button" aria-pressed={i === selected} data-icon-id={i.id} data-icon-name={i.label} data-icon-group-name={i.group} data-icon-file={fileName(i.svgPath).replace(/\.svg$/, "")}>
                      <span className="icon-tile-svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg(i, 24) }} />
                      <span className="icon-tile-name">{i.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
