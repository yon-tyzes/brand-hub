// Everything a public page needs, built from plain data. The build creates one from the brand folder
// (src/lib/site-server.ts); the editor's preview creates one from the draft. No file system access here.
import type { Asset, AssetType, ColorAsset, FontAsset, IconAsset, LogoAsset, RuleAsset, TemplateAsset, AnyRecord } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";
import type { ChangelogEntry } from "../../schemas/changelog.ts";
import type { HubConfig, ModuleId } from "../../schemas/hub-config.ts";
import type { SearchAction } from "../lib/search-config.ts";
import { fileName, isExternal } from "../lib/paths.ts";
import { TYPE_LABEL } from "../lib/labels.ts";
import { MODULES, type ModuleDef } from "../modules/registry.ts";

export interface SiteInput {
  brand: Brand;
  config: Pick<HubConfig, "modules" | "indexing" | "search">;
  engineVersion: string;
  /** Locked assets and rules: what public pages show. */
  assets: Asset[];
  rules: RuleAsset[];
  pending: AnyRecord[];
  changelog: ChangelogEntry[];
  /** Public URL of a file in the brand folder. */
  urlFor: (path: string) => string;
  /** SVG markup of a brand file, when available. */
  svgFor: (path: string) => string | undefined;
}

export type OfType<T extends AssetType> = Extract<Asset, { type: T }>;

export const MODULE_FOR_TYPE: Partial<Record<AssetType, ModuleId>> = {
  logo: "logos", color: "colors", font: "fonts", icon: "icons", template: "templates", "photo-source": "photos",
};

export const LOGOS_ZIP = "/downloads/logos-all.zip";

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
export const formatRgb = (c: ColorAsset) => `rgb(${c.rgb.join(", ")})`;
export const formatCmyk = (c: ColorAsset) => (c.cmyk ? c.cmyk.join(", ") : undefined);
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function logoFile(l: LogoAsset, ext: string) {
  return l.files.find((f) => f.ext === ext);
}

/** Label for a template's open button: names Canva when the link goes there. */
export function templateOpenLabel(t: TemplateAsset): string {
  try {
    const host = new URL(t.url ?? "").hostname;
    return host === "canva.com" || host.endsWith(".canva.com") ? "Open in Canva" : "Open template";
  } catch {
    return "Open template";
  }
}

export function fontZips(f: FontAsset): { kind: "static" | "variable"; href: string; files: string[] }[] {
  const out: { kind: "static" | "variable"; href: string; files: string[] }[] = [];
  if (f.files.static.length) out.push({ kind: "static", href: `/downloads/font-${f.id}-static.zip`, files: f.files.static });
  if (f.files.variable.length) out.push({ kind: "variable", href: `/downloads/font-${f.id}-variable.zip`, files: f.files.variable });
  return out;
}

export function createSite(input: SiteInput) {
  const assetById = new Map(input.assets.map((a) => [a.id, a]));
  const ruleById = new Map(input.rules.map((r) => [r.id, r]));
  const isEnabled = (id: ModuleId) => input.config.modules.includes(id);
  const modules: ModuleDef[] = input.config.modules.map((id) => MODULES[id]);

  const assetHref = (a: Asset | RuleAsset): string | undefined => {
    if (a.type === "rule") return isEnabled("guide") ? `/guide/${a.id}` : undefined;
    const mod = MODULE_FOR_TYPE[a.type];
    return mod && isEnabled(mod) ? `${MODULES[mod].route}#${a.id}` : undefined;
  };

  /** Inline SVG of a brand icon, sized for decorative use. */
  const iconMarkup = (i: IconAsset, size = 24): string =>
    (input.svgFor(i.svgPath) ?? "")
      .replace(/\swidth="[^"]*"/, ` width="${size}"`)
      .replace(/\sheight="[^"]*"/, ` height="${size}"`)
      .trim();

  const site = {
    ...input,
    modules,
    isEnabled,
    assetHref,
    iconMarkup,
    assetsOfType: <T extends AssetType>(type: T): OfType<T>[] => input.assets.filter((a): a is OfType<T> => a.type === type),
    findAsset: (id: string) => assetById.get(id),
    findRule: (id: string) => ruleById.get(id),
    /** Locked rules governing an asset: governedBy, then a template's own rules. */
    rulesFor: (a: Asset): RuleAsset[] => {
      const ids = [...(a.governedBy ?? []), ...(a.type === "template" ? a.rules : [])];
      return [...new Set(ids)].map((id) => ruleById.get(id)).filter((r): r is RuleAsset => !!r);
    },
    /** Newest first. */
    sortedChangelog: (): ChangelogEntry[] => [...input.changelog].sort((a, b) => b.date.localeCompare(a.date)),
    /** Inline actions for an asset, default first. Shared by search results and home top tasks. */
    actionsFor: (a: Asset): SearchAction[] => {
      const href = assetHref(a);
      const view = (label = "View"): SearchAction[] => (href ? [{ kind: "open", label, href }] : []);
      switch (a.type) {
        case "color":
          return [
            { kind: "copy", label: "Copy hex", text: a.hex, message: `${a.label} hex ${a.hex} copied.` },
            { kind: "copy", label: "Copy RGB", text: formatRgb(a), message: `${a.label} RGB ${formatRgb(a)} copied.` },
            ...view(),
          ];
        case "icon":
          return [
            ...view("Open icon"),
            { kind: "copy", label: "Copy SVG", text: iconMarkup(a), message: `${a.label} icon SVG copied.` },
            { kind: "download", label: "Download SVG", href: input.urlFor(a.svgPath), filename: fileName(a.svgPath) },
          ];
        case "logo": {
          const out: SearchAction[] = [];
          for (const ext of ["svg", "png"]) {
            const f = logoFile(a, ext);
            if (f) out.push({ kind: "download", label: `Download ${ext.toUpperCase()}`, href: input.urlFor(f.path), filename: fileName(f.path) });
          }
          return [...out, ...view()];
        }
        case "font":
          return [
            ...fontZips(a).map((z): SearchAction => ({ kind: "download", label: `Download ${z.kind} fonts`, href: z.href, filename: z.href.split("/").pop()! })),
            ...view(),
          ];
        case "template":
          return [...(a.url ? [{ kind: "open" as const, label: templateOpenLabel(a), href: a.url, external: isExternal(a.url) }] : []), ...view()];
        case "photo-source":
          return [{ kind: "open", label: "Open photo library", href: a.url, external: true }, ...view()];
        default:
          return view();
      }
    },
  };
  return site;
}

export type Site = ReturnType<typeof createSite>;
export { TYPE_LABEL };
