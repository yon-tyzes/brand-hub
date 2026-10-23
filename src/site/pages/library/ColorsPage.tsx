// Colors (Colors.dc.html, ColorsMobile.dc.html): main and supporting colors with every value copyable,
// labeled by use, then the approved text-on-color pairs.
import type { ColorAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { colorPairs, colorRows, isLight, ruleStrip, splitColors } from "../../library.ts";
import { ColorRows, Icon, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

function MainColor({ color: c }: { color: ColorAsset }) {
  return (
    <article className="color-card" id={c.id}>
      <div className="color-card-block" style={{ background: c.hex }} />
      <div className="color-card-body">
        <h3 className="color-card-name">{c.label}</h3>
        {c.help && <p className="color-card-help">{c.help}</p>}
        <ColorRows color={c} rows={colorRows(c)} />
      </div>
    </article>
  );
}

function SupportingColor({ color: c }: { color: ColorAsset }) {
  return (
    <article className="support-card" id={c.id}>
      <div className="support-card-block" style={{ background: c.hex }} />
      <div className="support-card-body">
        <h3 className="color-card-name">{c.label}</h3>
        {c.help && <p className="color-card-help">{c.help}</p>}
        <button className="support-copy" type="button" data-copy={c.hex} data-copy-name={c.label}>
          <span className="visually-hidden">Copy </span>
          <span className="support-copy-swatch" style={{ background: c.hex }} aria-hidden="true" />
          <span className="support-copy-name">{c.label}</span>
          <Icon name="copy" size={16} />
          <span className="support-copy-hex">{c.hex}</span>
        </button>
      </div>
    </article>
  );
}

export function ColorsPage() {
  const site = useSite();
  const colors = site.assetsOfType("color");
  const { main, supporting } = splitColors(colors);
  const pairs = colorPairs(colors);
  return (
    <div className="library colors-page">
      <LibraryHead
        title={MODULES.colors.label}
        intro="Click any value to copy it. Use Web for screens, Print for paper, and Sign for vendors who ask for a PMS number."
        introShort="Tap any value to copy it."
      />
      <RuleStrip strip={ruleStrip(site, "colors", colors)} />
      {main.length > 0 && (
        <section aria-labelledby="main-colors">
          <h2 className="library-section-title" id="main-colors">Main colors</h2>
          <div className="library-grid color-grid">{main.map((c) => <MainColor key={c.id} color={c} />)}</div>
        </section>
      )}
      {supporting.length > 0 && (
        <section aria-labelledby="supporting-colors">
          <h2 className="library-section-title" id="supporting-colors">Supporting colors</h2>
          <div className="library-grid color-grid support-grid">{supporting.map((c) => <SupportingColor key={c.id} color={c} />)}</div>
        </section>
      )}
      {pairs.length > 0 && (
        <section aria-labelledby="text-on-color">
          <h2 className="library-section-title pairs-title" id="text-on-color">Text on color</h2>
          <p className="pairs-intro">Pairs that are easy to read. Use only these for text on a colored background.</p>
          <ul className="pair-grid" role="list">
            {pairs.map((p) => (
              <li key={p.key} className={isLight(p.bg.hex) ? "pair pair-light" : "pair"} style={{ background: p.bg.hex, color: p.fg.hex }}>
                <p>{p.fg.label} on {p.bg.label}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
