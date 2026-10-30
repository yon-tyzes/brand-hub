// Templates (Templates.dc.html, TemplatesMobile.dc.html, NOTES.md 1): category filters, the template rules,
// and one card per template with the formats it has. "Open in Canva" is the primary button when there is a
// Canva link; Word, PowerPoint, and PDF follow. A template with variants gets a switcher of labeled chips on
// native radio inputs: picking one swaps the thumbnail and, when variants set their own formats, the buttons.
// The stylesheet does the swap, so the page needs no script for it.
import type { TemplateAsset, TemplateVariant } from "../../../../schemas/asset.ts";
import { MODULES } from "../../../modules/registry.ts";
import { slug, type Site } from "../../data.ts";
import { ruleStrip } from "../../library.ts";
import { AssetCard, Button, Chip, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

function Links({ site, t, variant }: { site: Site; t: TemplateAsset; variant?: TemplateVariant }) {
  const name = variant ? `${t.label}, ${variant.label}` : t.label;
  return site.templateLinks(t, variant).map((l, i) => (
    <Button
      key={l.format}
      variant={i === 0 && l.format === "canva" ? "primary" : "secondary"}
      href={l.href}
      external={l.external}
      download={l.filename}
      aria-label={`${l.label}: ${name}${l.external ? " (opens in a new tab)" : ""}`}
    >
      {l.label}
    </Button>
  ));
}

function TemplateCard({ site, t }: { site: Site; t: TemplateAsset }) {
  const variants = t.variants && t.variants.length > 1 ? t.variants : undefined;
  const ownLinks = variants?.some((v) => v.formats);
  const thumb = (path: string, label: string, panel?: number) => (
    <img key={panel ?? 0} src={site.urlFor(path)} alt={`${label} template preview`} loading="lazy" data-variant-panel={panel} />
  );
  return (
    <AssetCard
      id={t.id}
      size="lg"
      headingLevel={2}
      className="template-card"
      title={t.label}
      help={t.help}
      well={variants ? variants.map((v, i) => thumb(v.thumbnail, `${t.label}, ${v.label}`, i + 1)) : thumb(t.variants?.[0]?.thumbnail ?? t.thumbnail, t.label)}
      actions={
        ownLinks
          ? variants!.map((v, i) => (
              <div key={v.id} className="variant-actions" data-variant-panel={i + 1}>
                <Links site={site} t={t} variant={v} />
              </div>
            ))
          : <Links site={site} t={t} />
      }
    >
      <p className="template-category">{t.category}</p>
      {variants && (
        <fieldset className="variant-switch">
          <legend className="visually-hidden">{t.label} variants</legend>
          {variants.map((v, i) => (
            <label key={v.id} className="chip variant-chip">
              <input className="visually-hidden" type="radio" name={`variant-${t.id}`} value={v.id} defaultChecked={i === 0} data-variant-pick={i + 1} />
              {v.label}
            </label>
          ))}
        </fieldset>
      )}
    </AssetCard>
  );
}

export function TemplatesPage() {
  const site = useSite();
  const templates = site.assetsOfType("template").filter((t) => site.templateLinks(t).length > 0);
  const categories = [...new Set(templates.map((t) => t.category))];
  return (
    <div className="library templates-page" data-filter-root="">
      <LibraryHead title={MODULES.templates.label} intro="Start from a template so the logo, fonts, and colors are already right." />
      <RuleStrip strip={ruleStrip(site, "templates", templates)} />
      {categories.length > 1 && (
        <div className="chips filter-chips" role="group" aria-label="Filter templates">
          <Chip pressed data-filter-value="all">All</Chip>
          {categories.map((c) => <Chip key={c} pressed={false} data-filter-value={slug(c)}>{c}</Chip>)}
        </div>
      )}
      <ul className="library-grid template-grid" role="list" aria-label="Templates">
        {templates.map((t) => (
          <li key={t.id} data-filter-item="" data-values={slug(t.category)}>
            <TemplateCard site={site} t={t} />
          </li>
        ))}
      </ul>
      <p className="visually-hidden" role="status" data-filter-status="" data-noun="templates" />
    </div>
  );
}
