// Icons (Icons.dc.html, IconsMobile.dc.html): groups, a name filter, the brand's icon colors, and the
// selected icon's panel with downloads. On phones the panel docks to the bottom. src/scripts/icons.ts does
// the selecting, recoloring, filtering, and file export; without it every icon still shows.
import type { CSSProperties } from "react";
import type { IconAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { fileName } from "../../../lib/paths.ts";
import { ruleStrip } from "../../library.ts";
import { Icon, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

export function IconsPage() {
  const site = useSite();
  const icons = site.assetsOfType("icon");
  const groups = [...new Set(icons.map((i) => i.group))];
  const colors = (site.brand.modules.icons?.colors ?? []).map((id) => site.findAsset(id)).flatMap((c) => (c?.type === "color" ? [c] : []));
  const first = colors[0];
  const selected = icons[0];
  const svg = (i: IconAsset, size: number) => site.iconMarkup(i, size);
  const meta = (i: IconAsset) => [i.group, first?.label].filter(Boolean).join(" · ");
  return (
    <div className="library icons-page" data-icons-root="" style={{ "--icon-color": first?.hex ?? "var(--text)" } as CSSProperties}>
      <LibraryHead
        title={MODULES.icons.label}
        intro="Pick a color, then click an icon to download it. Use them at 16, 24, or 32 pixels, with a text label unless the meaning is universal."
        introShort="Pick a color, then tap an icon."
      />
      <RuleStrip strip={ruleStrip(site, "icons", icons)} />
      <div className="icon-toolbar">
        <label className="visually-hidden" htmlFor="icon-filter">Filter icons by name</label>
        <input id="icon-filter" type="search" placeholder="Filter by name" autoComplete="off" data-icon-filter="" />
        {colors.length > 0 && (
          <div className="icon-colors" role="radiogroup" aria-label="Icon color">
            {colors.map((c, i) => (
              <button key={c.id} className="chip" type="button" role="radio" aria-checked={i === 0} tabIndex={i === 0 ? 0 : -1} data-icon-color={c.hex} data-color-id={c.id} data-color-name={c.label}>
                <span className="chip-dot" style={{ background: c.hex }} aria-hidden="true" />
                {c.label}
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
                <button className="btn btn-primary" type="button" data-icon-download="svg">
                  <Icon name="download" size={16} />
                  <span className="label-long">For print and slides</span>
                  <span className="label-short">For slides</span>
                  <span className="btn-format">SVG</span>
                </button>
                <button className="btn btn-secondary" type="button" data-icon-download="png">
                  <span className="label-long">For Word and email</span>
                  <span className="label-short">For Word</span>
                  <span className="btn-format">PNG</span>
                </button>
              </div>
              <p className="icon-panel-source">{selected.source}</p>
            </div>
          </aside>
        )}
        <div className="icon-groups">
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
