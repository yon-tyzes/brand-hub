// Templates (Templates.dc.html, TemplatesMobile.dc.html, NOTES.md 1): category filters, the template rules,
// and one card per template with the formats it has. "Open in Canva" is the primary button when there is a
// Canva link; Word, PowerPoint, and PDF follow.
import { MODULES } from "../../../modules/registry.ts";
import { slug } from "../../data.ts";
import { ruleStrip } from "../../library.ts";
import { AssetCard, Button, Chip, LibraryHead, RuleStrip, useSite } from "../../ui.tsx";

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
            <AssetCard
              id={t.id}
              size="lg"
              headingLevel={2}
              className="template-card"
              title={t.label}
              help={t.help}
              well={<img src={site.urlFor(t.thumbnail)} alt={`${t.label} template preview`} loading="lazy" />}
              actions={site.templateLinks(t).map((l, i) => (
                <Button
                  key={l.format}
                  variant={i === 0 && l.format === "canva" ? "primary" : "secondary"}
                  href={l.href}
                  external={l.external}
                  download={l.filename}
                  aria-label={`${l.label}: ${t.label}${l.external ? " (opens in a new tab)" : ""}`}
                >
                  {l.label}
                </Button>
              ))}
            >
              <p className="template-category">{t.category}</p>
            </AssetCard>
          </li>
        ))}
      </ul>
      <p className="visually-hidden" role="status" data-filter-status="" data-noun="templates" />
    </div>
  );
}
