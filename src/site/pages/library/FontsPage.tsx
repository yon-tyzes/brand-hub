// Fonts (Fonts.dc.html, FontsMobile.dc.html): a type tester, then one card per family with its weights,
// downloads named by use, install steps, and license. Phones get "Copy page link", since fonts install on a computer.
import type { CSSProperties } from "react";
import type { FontAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { fontZips } from "../../data.ts";
import { rulesForItems, ruleStrip } from "../../library.ts";
import { Button, Icon, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

const WEIGHT_NAME: Record<number, string> = {
  100: "Thin", 200: "Extra light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra bold", 900: "Black",
};
const weightLabel = (w: number) => `${WEIGHT_NAME[w] ?? "Weight"} ${w}`;

/** Display families show at their middle weight; text families at their lightest. */
const sampleWeight = (f: FontAsset) => (f.role.toLowerCase() === "display" ? f.weights[Math.floor(f.weights.length / 2)] : f.weights[0]);

const LICENSE: Record<string, string> = { "OFL-1.1": "Free to use. SIL Open Font License 1.1." };

/** Zips by use: static files for a computer, the variable file for websites. */
function fontDownloads(f: FontAsset) {
  const zips = fontZips(f);
  const computer = zips.find((z) => z.kind === "static") ?? zips[0];
  const web = zips.find((z) => z.kind === "variable" && z !== computer);
  const ext = (z: (typeof zips)[number]) => z.files[0]?.split(".").pop()?.toUpperCase() ?? "ZIP";
  return { computer, web: web && { ...web, format: ext(web) } };
}

export const DEFAULT_SAMPLE_SIZE = 56;

function FamilyCard({ font: f, sample }: { font: FontAsset; sample: string }) {
  const family = `"${f.family}", var(--font-sans)`;
  const { computer, web } = fontDownloads(f);
  return (
    <article className="font-card" id={f.id} aria-labelledby={`${f.id}-name`}>
      <div
        className="font-card-specimen"
        style={{ fontFamily: family }}
        {...(f.files.variable.length ? { "data-weight-range": `${Math.min(...f.weights)} ${Math.max(...f.weights)}` } : {})}
      >
        <p className="font-sample" style={{ fontWeight: sampleWeight(f) }} data-font-sample="">{sample}</p>
        <div className="font-weights">
          {f.weights.map((w) => <span key={w} style={{ fontWeight: w }}>{weightLabel(w)}</span>)}
        </div>
        <p className="font-weights-line">{f.weights.map(weightLabel).join(" · ")}</p>
      </div>
      <div className="font-card-body">
        <div className="font-card-text">
          <h2 className="font-card-name" id={`${f.id}-name`}>{f.label}</h2>
          {f.help && <p className="font-card-help">{f.help}</p>}
          <p className="font-card-install"><span>To install:</span> {f.install}</p>
          <p className="font-card-license">{LICENSE[f.license] ?? `License: ${f.license}`}</p>
        </div>
        <div className="font-card-actions">
          {computer && (
            <Button variant="primary" href={computer.href} download icon="download" format="ZIP" suffix={f.label}>
              <span className="label-long">For your computer</span>
              <span className="label-short">Download font files</span>
            </Button>
          )}
          {web && (
            <Button href={web.href} download format={web.format} className="hide-phone-flex" suffix={f.label}>For websites</Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function FontsPage() {
  const site = useSite();
  const fonts = site.assetsOfType("font");
  // The pairing rule says what the families are for; it opens the page instead of sitting in the strip.
  const [pairing, ...others] = rulesForItems(site, fonts);
  const lead = pairing ? `${pairing.title.replace(/\.$/, "")}.` : "";
  const strip = ruleStrip(site, "fonts", fonts);
  const shown = strip && others.length ? { ...strip, lines: strip.lines.slice(1) } : undefined;
  const sample = site.brand.name;
  return (
    <div className="library fonts-page" data-font-tester-root="" style={{ "--sample-size": `${DEFAULT_SAMPLE_SIZE}px` } as CSSProperties}>
      <LibraryHead
        title={MODULES.fonts.label}
        intro={`${lead ? `${lead} ` : ""}Type below to try your own words.`}
        introShort={lead || undefined}
      />
      <RuleStrip strip={shown} />
      <div className="font-tester hide-phone-flex">
        <label htmlFor="font-tester-text">Try it</label>
        <input id="font-tester-text" type="text" defaultValue={sample} data-font-tester-text="" data-default={sample} />
        <label htmlFor="font-tester-size">Size</label>
        <input id="font-tester-size" type="range" min={24} max={96} step={4} defaultValue={DEFAULT_SAMPLE_SIZE} data-font-tester-size="" />
        <output htmlFor="font-tester-size" data-font-tester-readout="">{DEFAULT_SAMPLE_SIZE}px</output>
      </div>
      <div className="font-phone-note show-phone">
        <p><Icon name="monitor" size={20} /><span>Fonts install on a computer. Open this page there, or copy the link to send it to yourself.</span></p>
        <button className="btn btn-secondary btn-block" type="button" data-copy-page="">Copy page link</button>
      </div>
      {fonts.map((f) => <FamilyCard key={f.id} font={f} sample={sample} />)}
    </div>
  );
}
