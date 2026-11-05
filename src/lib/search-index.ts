// Builds the search documents for every locked asset and rule. Each document carries its inline actions.
import MiniSearch from "minisearch";
import type { Asset } from "../../schemas/asset.ts";
import { MODULES } from "../modules/registry.ts";
import { logoFile, MODULE_FOR_TYPE, templateThumbnail, TYPE_LABEL } from "../site/data.ts";
import { logoGround } from "../site/library.ts";
import { searchOptions, type SearchDoc } from "./search-config.ts";
import { site } from "./site-server.ts";

function previewImage(a: Asset): string | undefined {
  if (a.type === "template") return site.urlFor(templateThumbnail(a));
  if (a.type !== "logo") return undefined;
  const f = logoFile(a, "svg") ?? logoFile(a, "png");
  return f && site.urlFor(f.path);
}

/** Search documents for public, locked items whose module is on. Templates without a link are left out. */
export function searchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const a of site.assets) {
    if (!site.assetHref(a)) continue;
    if (a.type === "template" && !site.templateLinks(a).length) continue;
    docs.push({
      id: a.id,
      type: a.type,
      typeLabel: TYPE_LABEL[a.type],
      group: MODULES[MODULE_FOR_TYPE[a.type]!].label,
      label: a.label,
      help: a.help,
      keywords: [...(a.keywords ?? []), ...(a.type === "icon" ? [a.group] : []), ...(a.type === "color" ? [a.hex] : []), ...(a.type === "gradient" ? ["gradient", "css", ...a.stops.map((s) => s.hex)] : [])].join(" "),
      swatch: a.type === "color" ? a.hex : undefined,
      svg: a.type === "icon" ? site.iconMarkup(a, 20) : undefined,
      image: previewImage(a),
      ground: a.type === "logo" ? logoGround(site, a) : undefined,
      actions: site.actionsFor(a),
    });
  }
  const theme = site.officeTheme();
  if (theme) {
    docs.push({
      id: "office-theme", type: "document", typeLabel: "THMX", group: MODULES.office.label, label: MODULES.office.label, help: MODULES.office.help,
      keywords: "office word powerpoint excel theme thmx",
      actions: [
        { kind: "download", label: "THMX", href: theme.href, filename: theme.filename },
        { kind: "open", label: "Open", href: `${MODULES.office.route}/` },
      ],
    });
  }
  if (site.isEnabled("guide")) {
    const pdf = site.guidePdf();
    if (pdf) {
      docs.push({
        id: "brand-guide-pdf", type: "document", typeLabel: "PDF", group: MODULES.guide.label, label: `${MODULES.guide.label} (PDF)`,
        keywords: "pdf guidelines guide book", actions: [{ kind: "open", label: "Open", href: pdf.href, external: true }],
      });
    }
    for (const r of site.rules) {
      const href = site.assetHref(r);
      docs.push({
        id: r.id, type: "rule", typeLabel: "Rule", group: "Rules", label: r.title,
        help: `${MODULES.guide.label}, ${site.brand.guide.chapters.find((c) => c.id === r.chapter)?.title ?? r.label}`,
        keywords: (r.keywords ?? []).join(" "), actions: href ? [{ kind: "open", label: "Open", href }] : [],
      });
    }
  }
  return docs;
}

export function buildSearchIndex(): string {
  const ms = new MiniSearch<SearchDoc>(searchOptions);
  ms.addAll(searchDocs());
  return JSON.stringify({ brand: site.brand.shortName, index: ms });
}
