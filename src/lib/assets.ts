// Build-time helpers shared by pages, endpoints, and the search index. Server side only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brandDir, config, content } from "virtual:brand-hub";
import type { ChangelogEntry } from "../../schemas/changelog.ts";
import type { Asset, AssetType, ColorAsset, FontAsset, IconAsset, LogoAsset, RuleAsset, TemplateAsset } from "../../schemas/asset.ts";
import type { ModuleId } from "../../schemas/hub-config.ts";
import { MODULES } from "../modules/registry.ts";

type OfType<T extends AssetType> = Extract<Asset, { type: T }>;

export function assetsOfType<T extends AssetType>(type: T): OfType<T>[] {
  return content.assets.filter((a): a is OfType<T> => a.type === type);
}

export const isEnabled = (id: ModuleId) => config.modules.includes(id);

const assetById = new Map(content.assets.map((a) => [a.id, a]));
const ruleById = new Map(content.rules.map((r) => [r.id, r]));

export const findAsset = (id: string) => assetById.get(id);
export const findRule = (id: string) => ruleById.get(id);

export { fileName, fileUrl } from "./paths.ts";

export function readBrandFile(path: string): string {
  return readFileSync(join(brandDir, path), "utf8");
}

export const MODULE_FOR_TYPE: Partial<Record<AssetType, ModuleId>> = {
  logo: "logos", color: "colors", font: "fonts", icon: "icons", template: "templates", "photo-source": "photos",
};

/** Page and anchor where an asset is shown, or undefined when its module is off. */
export function assetHref(a: Asset | RuleAsset): string | undefined {
  if (a.type === "rule") return isEnabled("guide") ? `/guide/${a.id}` : undefined;
  const mod = MODULE_FOR_TYPE[a.type];
  return mod && isEnabled(mod) ? `${MODULES[mod].route}#${a.id}` : undefined;
}

/** Locked rules that govern an asset: governedBy plus a template's own rules, in that order. */
export function rulesFor(a: Asset): RuleAsset[] {
  const ids = [...(a.governedBy ?? []), ...(a.type === "template" ? a.rules : [])];
  return [...new Set(ids)].map((id) => ruleById.get(id)).filter((r): r is RuleAsset => !!r);
}

export const TYPE_LABEL: Record<AssetType, string> = {
  logo: "Logo", color: "Color", font: "Font", icon: "Icon", template: "Template", "photo-source": "Photo library",
  boilerplate: "Boilerplate", document: "Document", rule: "Rule", "signature-layout": "Signature layout",
};

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));

export const formatRgb = (c: ColorAsset) => `rgb(${c.rgb.join(", ")})`;
export const formatCmyk = (c: ColorAsset) => (c.cmyk ? `${c.cmyk.join(", ")}` : undefined);

/** Zip downloads built at build time, by URL. */
export function fontZips(f: FontAsset): { kind: "static" | "variable"; href: string; files: string[] }[] {
  const out: { kind: "static" | "variable"; href: string; files: string[] }[] = [];
  if (f.files.static.length) out.push({ kind: "static", href: `/downloads/font-${f.id}-static.zip`, files: f.files.static });
  if (f.files.variable.length) out.push({ kind: "variable", href: `/downloads/font-${f.id}-variable.zip`, files: f.files.variable });
  return out;
}

export const LOGOS_ZIP = "/downloads/logos-all.zip";

export function logoFile(l: LogoAsset, ext: string) {
  return l.files.find((f) => f.ext === ext);
}

/** Label for the open button on a template: names Canva when the link goes there. */
export function templateOpenLabel(t: TemplateAsset): string {
  try {
    const host = new URL(t.url ?? "").hostname;
    return host === "canva.com" || host.endsWith(".canva.com") ? "Open in Canva" : "Open template";
  } catch {
    return "Open template";
  }
}

/** Inline SVG markup of a brand icon, sized and labelled for decorative use. */
export function iconMarkup(i: IconAsset, size = 24): string {
  return readBrandFile(i.svgPath)
    .replace(/\swidth="[^"]*"/, ` width="${size}"`)
    .replace(/\sheight="[^"]*"/, ` height="${size}"`)
    .trim();
}

/** Newest first. */
export function sortedChangelog(): ChangelogEntry[] {
  return [...content.changelog].sort((a, b) => b.date.localeCompare(a.date));
}
