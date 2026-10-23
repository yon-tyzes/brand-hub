// Photos (no screen; built from the Logos layout): a link card for each photo source, labeled with who can
// open it, then the photo and headshot rules in full.
import type { PhotoSourceAsset } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { rulesForItems, ruleStrip } from "../../library.ts";
import { AssetCard, Button, LibraryHead, RuleBody, RuleStrip, useSite } from "../../ui.tsx";

const PROVIDER = { dropbox: "Dropbox", drive: "Google Drive", sharepoint: "SharePoint", url: "Web link" } as const;
const access = (s: PhotoSourceAsset) =>
  s.access === "open" ? "Open to anyone, no sign-in needed." : `Sign-in required.${s.accessGroup ? ` ${s.accessGroup} can open it.` : ""}`;

export function PhotosPage() {
  const site = useSite();
  const sources = site.assetsOfType("photo-source");
  const rules = rulesForItems(site, sources);
  return (
    <div className="library photos-page">
      <LibraryHead title={MODULES.photos.label} intro="Find photos in the library, then follow the rules below when you pick and take them." />
      <RuleStrip strip={ruleStrip(site, "photos", sources)} />
      <div className="library-grid logo-grid">
        {sources.map((s) => (
          <AssetCard
            key={s.id}
            id={s.id}
            size="lg"
            headingLevel={2}
            title={s.label}
            help={s.help}
            actions={<Button variant="primary" href={s.url} external>Open photo library</Button>}
          >
            <p className="photo-access">{PROVIDER[s.provider]} · {access(s)}</p>
            {s.guidelines.length > 0 && (
              <ul className="photo-guidelines">
                {s.guidelines.map((g) => <li key={g}>{g}</li>)}
              </ul>
            )}
          </AssetCard>
        ))}
      </div>
      {rules.map((r) => (
        <section key={r.id} className="photo-rule" id={r.id} aria-labelledby={`rule-${r.id}`}>
          <h2 className="library-section-title" id={`rule-${r.id}`}>{r.title}</h2>
          <RuleBody rule={r} level={3} />
        </section>
      ))}
    </div>
  );
}
