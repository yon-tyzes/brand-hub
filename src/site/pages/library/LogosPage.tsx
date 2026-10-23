// Logos (Logos.dc.html, LogosMobile.dc.html): each lockup on the background it was made for, with its files
// named by use. PDF and EPS show when a logo has them.
import type { LogoAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { LOGOS_ZIP, logoFile } from "../../data.ts";
import { darkGround, logoDownloads, ruleStrip } from "../../library.ts";
import { AssetCard, Button, DownloadButton, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

/** Image size by lockup: a mark is square, a stacked logo is tall, anything else is wide. */
export const lockupShape = (l: LogoAsset) => {
  const lockup = l.lockup.toLowerCase();
  return lockup.includes("mark") || lockup.includes("icon") ? "mark" : lockup.includes("stack") ? "stacked" : "wide";
};

export function LogosPage() {
  const site = useSite();
  const logos = site.assetsOfType("logo");
  const dark = darkGround(site);
  const zip = logos.length > 0 && (
    <Button href={LOGOS_ZIP} download icon="download">All logos (ZIP)</Button>
  );
  return (
    <div className="library">
      <LibraryHead
        title={MODULES.logos.label}
        intro="Pick the logo that fits the space, then the file for where it's going."
        action={zip && <span className="hide-phone">{zip}</span>}
      />
      <RuleStrip strip={ruleStrip(site, "logos", logos)} />
      <div className="library-grid logo-grid">
        {logos.map((l) => {
          const f = logoFile(l, "svg") ?? logoFile(l, "png");
          return (
            <AssetCard
              key={l.id}
              id={l.id}
              size="lg"
              headingLevel={2}
              className="logo-card"
              title={l.label}
              help={l.help}
              well={f && <img className={`logo-img logo-img-${lockupShape(l)}`} src={site.urlFor(f.path)} alt={l.label} loading="lazy" />}
              wellStyle={l.background === "dark" ? { background: dark } : undefined}
              actions={logoDownloads(site, l).map((d, i) => (
                <DownloadButton key={d.format} d={d} variant={i === 0 ? "primary" : "secondary"} assetLabel={l.label} />
              ))}
            />
          );
        })}
      </div>
      {zip && <div className="show-phone">{zip}</div>}
    </div>
  );
}
