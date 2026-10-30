// Icons (Icons.dc.html, IconsMobile.dc.html): groups, a name filter, the brand's color pairs (an icon color on
// a ground), and the selected icon's panel with downloads. The grid sits on one panel filled with the pair's
// ground. On phones the detail panel docks to the bottom. src/scripts/icons.ts does the selecting, recoloring,
// filtering, and file export; without it every icon still shows, on the pair for the current theme.
import type { CSSProperties } from "react";
import type { IconAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { fileName } from "../../../lib/paths.ts";
import { defaultPairs, iconPairs, ruleStrip, type IconPair } from "../../library.ts";
import { Icon, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

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
        {pairs.length > 0 && (
          <div className="icon-colors" role="radiogroup" aria-label="Icon color">
            {pairs.map((p) => (
              <button
                key={p.id}
                className="chip"
                type="button"
                role="radio"
                aria-checked={p === first}
                tabIndex={p === first ? 0 : -1}
                data-pair={p.id}
                data-icon-color={p.icon.hex}
                data-ground={p.ground.hex}
                data-label-color={p.text}
                data-color-id={p.icon.id}
                data-color-name={p.label}
              >
                <span className="pair-dot" style={{ background: p.ground.hex, color: p.icon.hex }} aria-hidden="true" />
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
        <div className="icon-groups icon-board">
          {groups.map((g) => (
            <section key={g} aria-labelledby={`icons-${g.toLowerCase().replace(/\W+/g, "-")}`} data-icon-group="">
              <h2 className="icon-group-title" id={`icons-${g.toLowerCase().replace(/\W+/g, "-")}`}>{g}</h2>
              <ul className="icon-grid" role="list">
                {icons.filter((i) => i.group === g).map((i) => (
                  <li key={i.id} id={i.id} data-icon-item="" data-text={[i.label, i.group, ...(i.keywords ?? [])].join(" ").toLowerCase()}>
                    <button className="icon-tile-btn" type="button" aria-pressed={i === selected} data-icon-id={i.id} data-icon-name={i.label} data-icon-group={i.group} data-icon-file={fileName(i.svgPath).replace(/\.svg$/, "")}>
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
