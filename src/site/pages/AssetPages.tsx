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

export function TemplatesPage() {
  const site = useSite();
  const templates = site.assetsOfType("template").filter((t) => site.templateLinks(t).length > 0);
  const categories = [...new Set(templates.map((t) => t.category))];
  return (
    <>
      <PageHead title={MODULES.templates.label} />
      <div className="frame section stack-lg" data-filter-root="">
        {categories.length > 1 && (
          <div className="stack">
            <Pills label="Template categories" options={categories.map((c) => ({ value: slug(c), label: c, count: templates.filter((t) => t.category === c).length }))} allCount={templates.length} />
            <p className="small" role="status" data-filter-status="" data-noun="templates">{templates.length} templates shown</p>
          </div>
        )}
        <ul className="grid cards-3" role="list" aria-label="Templates">
          {templates.map((t) => (
            <li key={t.id} data-filter-item="" data-values={slug(t.category)} style={{ display: "grid" }}>
              <Card
                headingLevel={2}
                id={t.id}
                title={t.label}
                description={t.help}
                preview={<AssetPreview record={t} urlFor={site.urlFor} />}
                meta={<span className="caption">{t.category}</span>}
                footer={
                  <div className="row">
                    {site.templateLinks(t).map((l, i) => (
                      <Button
                        key={l.format}
                        variant={i === 0 && l.format === "canva" ? "primary" : "secondary"}
                        size="sm"
                        href={l.href}
                        external={l.external}
                        download={l.filename}
                        aria-label={`${l.label}: ${t.label}${l.external ? " (opens in a new tab)" : ""}`}
                      >
                        {l.label}
                      </Button>
                    ))}
                  </div>
                }
              >
                <RuleLinks asset={t} />
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
