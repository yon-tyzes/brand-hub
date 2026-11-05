// Everything a public page needs, built from plain data. The build creates one from the brand folder
// (src/lib/site-server.ts); the editor's preview creates one from the draft. No file system access here.
import type { Asset, AssetType, ColorAsset, FontAsset, IconAsset, LogoAsset, RuleAsset, TemplateAsset, TemplateFormat, TemplateVariant } from "../../schemas/asset.ts";
import { OFFICE_COLOR_SLOTS, type Brand } from "../../schemas/brand.ts";
import type { ChangelogEntry } from "../../schemas/changelog.ts";
import type { HubConfig, ModuleId } from "../../schemas/hub-config.ts";
import type { Onboarding } from "../../schemas/onboarding.ts";
import type { Signature } from "../../schemas/signature.ts";
import type { SearchAction } from "../lib/search-config.ts";
import { fileName, isExternal } from "../lib/paths.ts";
import { officeThemeFileName, type OfficeColorSlot, type OfficeThemeInput } from "../office/index.ts";
import { gradientCss } from "./library.ts";
import { TYPE_LABEL } from "../lib/labels.ts";
import { MODULES, type ModuleDef } from "../modules/registry.ts";

export interface SiteInput {
  brand: Brand;
  config: Pick<HubConfig, "modules" | "indexing" | "search" | "hero">;
  engineVersion: string;
  /** Locked assets and rules: what public pages show. */
  assets: Asset[];
  rules: RuleAsset[];
  changelog: ChangelogEntry[];
  /** signature.json and onboarding.json, when the brand has them (spec section 14). */
  signature?: Signature;
  onboarding?: Onboarding;
  /** Public URL of a file in the brand folder. */
  urlFor: (path: string) => string;
  /** SVG markup of a brand file, when available. */
  svgFor: (path: string) => string | undefined;
  /** Size in bytes of a brand file, when known (the build reads it; the editor preview does not). */
  sizeOf?: (path: string) => number | undefined;
  /** Size in bytes of the built Office theme, when known (the build writes it; the editor preview does not). */
  officeThemeSize?: () => number | undefined;
}

/** The Office theme with its slots filled from brand data (spec section 7). */
export interface OfficeTheme {
  name: string;
  href: string;
  filename: string;
  /** Slot order, as Office lists them. */
  colors: { slot: OfficeColorSlot; color: ColorAsset }[];
  fonts: { major: FontAsset; minor: FontAsset };
  /** The latest `updated` among the slot colors and fonts. */
  updated: string;
  /** What the writer builds the file from. */
  input: OfficeThemeInput;
}

export type OfType<T extends AssetType> = Extract<Asset, { type: T }>;

export const MODULE_FOR_TYPE: Partial<Record<AssetType, ModuleId>> = {
  logo: "logos", color: "colors", gradient: "colors", font: "fonts", icon: "icons", template: "templates", "photo-source": "photos",
};

export const LOGOS_ZIP = "/downloads/logos-all.zip";

const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
export const formatCmyk = (c: ColorAsset) => (c.cmyk ? c.cmyk.join(", ") : undefined);
/** File size for a button label: "1.2 MB", "340 KB". */
export const formatBytes = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function logoFile(l: LogoAsset, ext: string) {
  return l.files.find((f) => f.ext === ext);
}

export interface TemplateLink {
  format: TemplateFormat | "link";
  label: string;
  href: string;
  external: boolean;
  /** File name for formats that download. */
  filename?: string;
}

const FILE_FORMATS = [
  ["docx", "Word"],
  ["pptx", "PowerPoint"],
  ["pdf", "PDF"],
] as const;

/** The image that stands for a template: its first variant's, when it has variants (spec section 5). */
export const templateThumbnail = (t: TemplateAsset) => t.variants?.[0]?.thumbnail ?? t.thumbnail;

/**
 * A template's formats in button order (spec section 5): Canva first, then Word, PowerPoint, and PDF. Only the
 * formats it has. A 0.1 `url` stands in as one "Open template" link when no format is set. With variants, the
 * links are those of `variant` (the first by default), which falls back to the template's own formats.
 */
export function templateLinks(t: TemplateAsset, urlFor: (path: string) => string, variant: TemplateVariant | undefined = t.variants?.[0]): TemplateLink[] {
  const out: TemplateLink[] = [];
  const formats = variant?.formats ?? t.formats;
  if (formats.canva) out.push({ format: "canva", label: "Open in Canva", href: formats.canva, external: true });
  for (const [format, label] of FILE_FORMATS) {
    const path = formats[format];
    if (path) out.push({ format, label, href: urlFor(path), external: false, filename: fileName(path) });
  }
  if (!out.length && t.url) out.push({ format: "link", label: "Open template", href: t.url, external: isExternal(t.url) });
  return out;
}

/** The "Download all" zip of one font group: every family's static and variable files. */
export const fontGroupZip = (groupId: string) => `/downloads/fonts-${groupId}.zip`;

export function fontZips(f: FontAsset): { kind: "static" | "variable"; href: string; files: string[] }[] {
  const out: { kind: "static" | "variable"; href: string; files: string[] }[] = [];
  if (f.files.static.length) out.push({ kind: "static", href: `/downloads/font-${f.id}-static.zip`, files: f.files.static });
  if (f.files.variable.length) out.push({ kind: "variable", href: `/downloads/font-${f.id}-variable.zip`, files: f.files.variable });
  return out;
}

/** Fills the Office theme slots from locked assets. Undefined when the brand sets none or a slot has no locked item. */
export function officeThemeOf(brand: Brand, findAsset: (id: string) => Asset | undefined): OfficeTheme | undefined {
  const o = brand.modules.office;
  if (!o) return undefined;
  const colors = OFFICE_COLOR_SLOTS.map((slot) => ({ slot, color: findAsset(o.colors[slot]) }));
  const major = findAsset(o.fonts.major);
  const minor = findAsset(o.fonts.minor);
  if (major?.type !== "font" || minor?.type !== "font" || colors.some((c) => c.color?.type !== "color")) return undefined;
  const filled = colors as { slot: OfficeColorSlot; color: ColorAsset }[];
  const filename = officeThemeFileName(o.themeName);
  return {
    name: o.themeName,
    href: `/downloads/${filename}`,
    filename,
    colors: filled,
    fonts: { major, minor },
    updated: [...filled.map((c) => c.color.updated), major.updated, minor.updated].sort().at(-1)!,
    input: {
      name: o.themeName,
      colors: Object.fromEntries(filled.map((c) => [c.slot, c.color.hex])) as OfficeThemeInput["colors"],
      fonts: { major: major.family, minor: minor.family },
    },
  };
}

export function createSite(input: SiteInput) {
  const assetById = new Map(input.assets.map((a) => [a.id, a]));
  const ruleById = new Map(input.rules.map((r) => [r.id, r]));
  const isEnabled = (id: ModuleId) => input.config.modules.includes(id);
  const modules: ModuleDef[] = input.config.modules.map((id) => MODULES[id]);

  const assetHref = (a: Asset | RuleAsset): string | undefined => {
    if (a.type === "rule") return isEnabled("guide") ? `${MODULES.guide.route}/${a.chapter}/#${a.id}` : undefined;
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
    /** The full brand guide PDF, with its size when known. */
    guidePdf: (): { href: string; label: string } | undefined => {
      const pdf = input.brand.guide.pdf;
      if (!pdf) return undefined;
      const size = input.sizeOf?.(pdf.path);
      return { href: input.urlFor(pdf.path), label: `Open the full guide (PDF${size ? `, ${formatBytes(size)}` : ""})` };
    },
    /** The Office theme download, when the module is on. */
    officeTheme: (): OfficeTheme | undefined => (isEnabled("office") ? officeThemeOf(input.brand, (id) => assetById.get(id)) : undefined),
    /** A template's formats, in button order. Empty when it has none. */
    templateLinks: (t: TemplateAsset, variant?: TemplateVariant) => templateLinks(t, input.urlFor, variant ?? t.variants?.[0]),
    /** Font groups in order, each with its locked fonts. Undefined when the brand sets no groups. Empty groups are left out. */
    fontGroups: () => {
      const groups = input.brand.modules.fonts?.groups;
      if (!groups) return undefined;
      const fonts = input.assets.filter((a): a is FontAsset => a.type === "font");
      return groups.map((g) => ({ ...g, fonts: fonts.filter((f) => f.group === g.id), href: fontGroupZip(g.id) })).filter((g) => g.fonts.length);
    },
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
    /** Inline actions for an asset in search results, default first. Labels are short: the value or the format. */
    actionsFor: (a: Asset): SearchAction[] => {
      const href = assetHref(a);
      const view = (label = "Open"): SearchAction[] => (href ? [{ kind: "open", label, href }] : []);
      const copy = (name: string, value: string): SearchAction => ({ kind: "copy", label: value, text: value, message: `${name} ${value} copied`, value: true });
      switch (a.type) {
        case "color":
          return [copy(a.label, a.hex), ...(a.pms ? [copy(a.label, a.pms)] : [])];
        case "gradient":
          return [{ kind: "copy", label: "Copy CSS", text: gradientCss(a), message: `${a.label} CSS copied` }, ...view()];
        case "icon":
          return [...view(), { kind: "download", label: "SVG", href: input.urlFor(a.svgPath), filename: fileName(a.svgPath) }];
        case "logo": {
          const out: SearchAction[] = [];
          for (const ext of ["png", "svg"]) {
            const f = logoFile(a, ext);
            if (f) out.push({ kind: "download", label: ext.toUpperCase(), href: input.urlFor(f.path), filename: fileName(f.path) });
          }
          return [...out, ...view()];
        }
        case "font": {
          const z = fontZips(a)[0];
          return [...(z ? [{ kind: "download", label: "Font files", href: z.href, filename: z.href.split("/").pop()! } as SearchAction] : []), ...view()];
        }
        case "template":
          return templateLinks(a, input.urlFor).map((l): SearchAction =>
            l.filename ? { kind: "download", label: l.label, href: l.href, filename: l.filename } : { kind: "open", label: l.label, href: l.href, external: l.external },
          );
        case "photo-source":
          return [{ kind: "open", label: "Open photo library", href: a.url, external: true }];
        default:
          return view();
      }
    },
  };
  return site;
}

export type Site = ReturnType<typeof createSite>;
export { TYPE_LABEL };
