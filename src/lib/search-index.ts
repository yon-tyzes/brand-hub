// Builds the search documents for every locked asset and rule. Each document carries its inline actions.
import MiniSearch from "minisearch";
import { brand, content } from "virtual:brand-hub";
import type { Asset, RuleAsset } from "../../schemas/asset.ts";
import { MODULES } from "../modules/registry.ts";
import {
  assetHref, fileName, fileUrl, fontZips, formatRgb, iconMarkup, isEnabled, logoFile, MODULE_FOR_TYPE, templateOpenLabel, TYPE_LABEL,
} from "./assets.ts";
import { searchOptions, type SearchAction, type SearchDoc } from "./search-config.ts";

function view(a: Asset | RuleAsset, label = "View"): SearchAction[] {
  const href = assetHref(a);
  return href ? [{ kind: "open", label, href }] : [];
}

function actionsFor(a: Asset): SearchAction[] {
  switch (a.type) {
    case "color":
      return [
        { kind: "copy", label: "Copy hex", text: a.hex, message: `${a.label} hex ${a.hex} copied.` },
        { kind: "copy", label: "Copy RGB", text: formatRgb(a), message: `${a.label} RGB ${formatRgb(a)} copied.` },
        ...view(a),
      ];
    case "icon": {
      const svg = iconMarkup(a);
      return [
        ...view(a, "Open icon"),
        { kind: "copy", label: "Copy SVG", text: svg, message: `${a.label} icon SVG copied.` },
        { kind: "download", label: "Download SVG", href: fileUrl(a.svgPath), filename: fileName(a.svgPath) },
      ];
    }
    case "logo": {
      const out: SearchAction[] = [];
      for (const ext of ["svg", "png"]) {
        const f = logoFile(a, ext);
        if (f) out.push({ kind: "download", label: `Download ${ext.toUpperCase()}`, href: fileUrl(f.path), filename: fileName(f.path) });
      }
      return [...out, ...view(a)];
    }
    case "font":
      return [
        ...fontZips(a).map((z): SearchAction => ({ kind: "download", label: `Download ${z.kind} fonts`, href: z.href, filename: z.href.split("/").pop()! })),
        ...view(a),
      ];
    case "template":
      return [...(a.url ? [{ kind: "open" as const, label: templateOpenLabel(a), href: a.url, external: true }] : []), ...view(a)];
    case "photo-source":
      return [{ kind: "open", label: "Open photo library", href: a.url, external: true }, ...view(a)];
    default:
      return view(a);
  }
}

function previewImage(a: Asset): string | undefined {
  if (a.type === "template") return fileUrl(a.thumbnail);
  if (a.type !== "logo") return undefined;
  const f = logoFile(a, "svg") ?? logoFile(a, "png");
  return f && fileUrl(f.path);
}

/** Search documents for public, locked items whose module is on. Templates without a link are left out. */
export function searchDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const a of content.assets) {
    if (!assetHref(a)) continue;
    if (a.type === "template" && !a.url) continue;
    docs.push({
      id: a.id,
      type: a.type,
      typeLabel: TYPE_LABEL[a.type],
      group: MODULES[MODULE_FOR_TYPE[a.type]!].label,
      label: a.label,
      help: a.help,
      keywords: [...(a.keywords ?? []), ...(a.type === "icon" ? [a.group] : []), ...(a.type === "color" ? [a.hex] : [])].join(" "),
      swatch: a.type === "color" ? a.hex : undefined,
      svg: a.type === "icon" ? iconMarkup(a, 20) : undefined,
      image: previewImage(a),
      imageBg: a.type === "logo" ? a.background : undefined,
      actions: actionsFor(a),
    });
  }
  if (isEnabled("guide")) {
    for (const r of content.rules) {
      docs.push({
        id: r.id, type: "rule", typeLabel: "Rule", group: MODULES.guide.label, label: r.title, help: r.label,
        keywords: (r.keywords ?? []).join(" "), actions: view(r, "Read rule"),
      });
    }
  }
  return docs;
}

export function buildSearchIndex(): string {
  const ms = new MiniSearch<SearchDoc>(searchOptions);
  ms.addAll(searchDocs());
  return JSON.stringify({ brand: brand.shortName, index: ms });
}
