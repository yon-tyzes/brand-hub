// Builds the search documents for every locked asset and rule. Each document carries its inline actions.
import MiniSearch from "minisearch";
import type { Asset } from "../../schemas/asset.ts";
import { MODULES } from "../modules/registry.ts";
import { logoFile, MODULE_FOR_TYPE, TYPE_LABEL } from "../site/data.ts";
import { searchOptions, type SearchDoc } from "./search-config.ts";
import { site } from "./site-server.ts";

function previewImage(a: Asset): string | undefined {
  if (a.type === "template") return site.urlFor(a.thumbnail);
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
      keywords: [...(a.keywords ?? []), ...(a.type === "icon" ? [a.group] : []), ...(a.type === "color" ? [a.hex] : [])].join(" "),
      swatch: a.type === "color" ? a.hex : undefined,
      svg: a.type === "icon" ? site.iconMarkup(a, 20) : undefined,
      image: previewImage(a),
      imageBg: a.type === "logo" ? a.background : undefined,
      actions: site.actionsFor(a),
    });
  }
  if (site.isEnabled("guide")) {
    for (const r of site.rules) {
      const href = site.assetHref(r);
      docs.push({
        id: r.id, type: "rule", typeLabel: "Rule", group: MODULES.guide.label, label: r.title, help: r.label,
        keywords: (r.keywords ?? []).join(" "), actions: href ? [{ kind: "open", label: "Read rule", href }] : [],
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
