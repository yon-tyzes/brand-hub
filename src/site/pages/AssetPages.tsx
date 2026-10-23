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

const ZIP_LABEL = { static: "Download static fonts (ZIP)", variable: "Download variable font (ZIP)" } as const;

export function FontsPage() {
  const site = useSite();
  const fonts = site.assetsOfType("font");
  return (
    <>
      <PageHead title={MODULES.fonts.label} />
      <section className="section frame stack-lg" aria-label="Font families">
        {fonts.map((f, fi) => (
          <article className="card" id={f.id} key={f.id} aria-labelledby={`${f.id}-title`}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div>
                <h2 className="h3" id={`${f.id}-title`}>{f.label}</h2>
                <p className="caption">{[f.role, `License ${f.license}`, `Weights ${f.weights.join(", ")}`].join(" · ")}</p>
                {f.help && <p className="small">{f.help}</p>}
              </div>
            </div>
            <div className="specimen" style={{ fontFamily: `"${f.family}", var(--font-body)` }}>
              <div className="specimen-editable" contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label={`Specimen in ${f.family}. Type to try your own text.`} spellCheck={false}>
                {site.brand.name}
              </div>
              <div className="specimen-weights">
                {f.weights.map((w) => (
                  <p key={w} style={{ fontWeight: w }}>
                    <span className="caption" style={{ fontFamily: "var(--font-body)", display: "inline-block", minWidth: "3.5em" }}>{w}</span>
                    Aa Bb Cc 0123456789
                  </p>
                ))}
              </div>
            </div>
            <div className="row">
              {fontZips(f).map((z, i) => (
                <Button key={z.kind} variant={fi === 0 && i === 0 ? "primary" : "secondary"} href={z.href} download icon="download">{ZIP_LABEL[z.kind]}</Button>
              ))}
            </div>
            <div className="prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.install) }} />
            <RuleLinks asset={f} />
          </article>
        ))}
      </section>
      {fonts.length > 0 && (
        <section className="section frame aside-layout" aria-labelledby="install">
          <SectionHead title="Install fonts" id="install" intro="Steps for each system. Install the files from the zip, then restart open apps." />
          <Accordion
            items={[
              {
                id: "install-windows",
                title: "Windows",
                body: (
                  <ol>
                    <li>Download the zip and open it.</li>
                    <li>Select all font files, right-click, and choose Install. Choose Install for all users if you have admin rights.</li>
                    <li>Restart any app that was open.</li>
                  </ol>
                ),
              },
              {
                id: "install-mac",
                title: "Mac",
                body: (
                  <ol>
                    <li>Download the zip. It opens into a folder.</li>
                    <li>Double-click each font file and choose Install Font. Font Book opens and adds it.</li>
                    <li>Restart any app that was open.</li>
                  </ol>
                ),
              },
              {
                id: "install-office",
                title: "Microsoft Office",
                body: (
                  <ol>
                    <li>Install the fonts on your computer with the Windows or Mac steps.</li>
                    <li>Quit and reopen Word, PowerPoint, Excel, and Outlook.</li>
                    <li>To send a file to someone without the fonts on Windows, choose File, Options, Save, then Embed fonts in the file.</li>
                  </ol>
                ),
              },
            ]}
          />
        </section>
      )}
    </>
  );
}

export function IconsPage() {
  const site = useSite();
  const icons = site.assetsOfType("icon");
  const groups = [...new Set(icons.map((i) => i.group))];
  const pinned = icons.filter((i) => i.pinned);
  const text = (i: (typeof icons)[number]) => [i.label, i.group, ...(i.keywords ?? [])].join(" ").toLowerCase();
  const tile = (i: (typeof icons)[number], withId: boolean) => (
    <li key={i.id} id={withId ? i.id : undefined} data-filter-item="" data-values={slug(i.group)} data-text={text(i)}>
      <button className="icon-button" type="button" data-icon-id={i.id} style={{ width: "100%" }}>
        <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: site.iconMarkup(i) }} />
        {i.label}
      </button>
    </li>
  );
  return (
    <>
      <PageHead title={MODULES.icons.label} />
      <div className="frame section stack-lg" data-filter-root="">
        <div className="stack-lg">
          <div style={{ maxWidth: 420 }}>
            <label className="small" htmlFor="icon-filter" style={{ display: "block", marginBottom: "var(--space-2)" }}>Filter icons by name</label>
            <input className="field" id="icon-filter" type="search" autoComplete="off" data-filter-search="" />
          </div>
          <Pills label="Icon groups" options={groups.map((g) => ({ value: slug(g), label: g, count: icons.filter((i) => i.group === g).length }))} allCount={icons.length} />
          <p className="small" role="status" data-filter-status="" data-noun="icons">{icons.length} icons shown</p>
        </div>
        {pinned.length > 0 && (
          <section className="stack" aria-labelledby="pinned" data-filter-group="">
            <h2 className="h3" id="pinned">Pinned</h2>
            <ul className="grid icon-grid" role="list">{pinned.map((i) => tile(i, false))}</ul>
          </section>
        )}
        {groups.map((g) => (
          <section key={g} className="stack" aria-labelledby={`group-${slug(g)}`} data-filter-group="">
            <h2 className="h3" id={`group-${slug(g)}`}>{g}</h2>
            <ul className="grid icon-grid" role="list">{icons.filter((i) => i.group === g).map((i) => tile(i, true))}</ul>
          </section>
        ))}
      </div>
    </>
  );
}

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
