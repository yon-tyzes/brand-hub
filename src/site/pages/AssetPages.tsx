// Page bodies for the asset modules. Same markup on the built site and in the editor's preview.
import { AssetPreview } from "../../components/previews/AssetPreview.tsx";
import { MODULES } from "../../modules/registry.ts";
import { contrastRatio } from "../../theme/color.ts";
import { MIN_RATIO } from "../../theme/contrast.ts";
import { renderMarkdown } from "../../lib/markdown.ts";
import { fileName } from "../../lib/paths.ts";
import type { PhotoSourceAsset } from "../../../schemas/asset.ts";
import { fontZips, formatCmyk, formatRgb, LOGOS_ZIP, slug } from "../data.ts";
import { Accordion, Button, Card, Icon, IconTile, Pills, RuleBody, RuleLinks, SectionHead, useSite } from "../ui.tsx";

const PageHead = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="frame page-head">
    <h1>{title}</h1>
    {children}
  </div>
);

const PROVIDER = { dropbox: "Dropbox", drive: "Google Drive", sharepoint: "SharePoint", url: "Web link" } as const;
const access = (s: PhotoSourceAsset) =>
  s.access === "open" ? "Open to anyone: no sign-in needed." : `Sign-in required.${s.accessGroup ? ` ${s.accessGroup} can open it.` : ""}`;

export function PhotosPage() {
  const site = useSite();
  const sources = site.assetsOfType("photo-source");
  const rules = [...new Map(sources.flatMap(site.rulesFor).map((r) => [r.id, r])).values()];
  return (
    <>
      <PageHead title={MODULES.photos.label} />
      <section className="section frame" aria-label="Photo libraries">
        <div className="grid cards-2">
          {sources.map((s) => (
            <Card
              key={s.id}
              headingLevel={2}
              id={s.id}
              title={s.label}
              description={s.help}
              meta={
                <>
                  <IconTile name="image" />
                  <span className="caption">{PROVIDER[s.provider]}</span>
                </>
              }
              footer={<Button variant="primary" href={s.url} external>Open {s.label.toLowerCase()}</Button>}
            >
              <p>{access(s)}</p>
              {s.guidelines.length > 0 && (
                <ul className="small prose" style={{ paddingLeft: "1.25em" }}>
                  {s.guidelines.map((g) => <li key={g}>{g}</li>)}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>
      {rules.map((r) => {
        const href = site.assetHref(r);
        return (
          <section key={r.id} className="section frame stack-lg" aria-labelledby={`rule-${r.id}`} id={r.id}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div>
                <h2 id={`rule-${r.id}`}>{r.title}</h2>
              </div>
              {href && <Button variant="text" href={href} iconEnd="arrow-right" aria-label={`Rule page: ${r.title}`}>Rule page</Button>}
            </div>
            <RuleBody rule={r} />
          </section>
        );
      })}
    </>
  );
}

