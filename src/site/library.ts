// What the Library pages show for each asset, worked out from brand data: downloads named by use, color
// values by use, the rules that apply to a page, and the ground a logo sits on (spec section 6, Library pages).
// Pure: shared by the build and the editor's preview.
import type { Asset, ColorAsset, LogoAsset, RuleAsset } from "../../schemas/asset.ts";
import type { ModuleId } from "../../schemas/hub-config.ts";
import { hexToRgb, relativeLuminance } from "../theme/color.ts";
import { fileName } from "../lib/paths.ts";
import type { Site } from "./data.ts";
import { chapterHref } from "./nav.ts";

export interface Download {
  /** What the file is for, the button's label. */
  label: string;
  /** Shorter label where space is tight (phones, home cards). */
  short: string;
  /** The format shown beside the label. */
  format: string;
  href: string;
  filename: string;
}

/** The largest file of an extension (several PNG widths: the widest). */
function best(l: LogoAsset, ext: string) {
  return l.files.filter((f) => f.ext === ext).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

/**
 * A logo's downloads by use, most common first: PNG for Word and PowerPoint, SVG for print and web, then PDF
 * and EPS for print and sign vendors when the logo has them.
 */
export function logoDownloads(site: Site, l: LogoAsset): Download[] {
  const uses = [
    { ext: "png", label: "For Word and PowerPoint", short: "For slides" },
    { ext: "svg", label: "For print and web", short: "For print" },
    { ext: "pdf", label: "For print vendors", short: "For print vendors" },
    { ext: "eps", label: "For sign makers", short: "For sign makers" },
  ];
  return uses.flatMap((u) => {
    const f = best(l, u.ext);
    return f ? [{ label: u.label, short: u.short, format: u.ext.toUpperCase(), href: site.urlFor(f.path), filename: fileName(f.path) }] : [];
  });
}

export interface ColorRow {
  /** Web, RGB, Print, or Sign. */
  use: string;
  value: string;
  /** Spoken label for the copy button. */
  name: string;
}

/** A color's values by use. Rows with no value are left out. */
export function colorRows(c: ColorAsset): ColorRow[] {
  const rows: ColorRow[] = [
    { use: "Web", value: c.hex, name: "hex" },
    { use: "RGB", value: c.rgb.join(" "), name: "RGB" },
  ];
  if (c.cmyk) rows.push({ use: "Print", value: c.cmyk.join(" "), name: "CMYK" });
  if (c.pms) rows.push({ use: "Sign", value: c.pms, name: "PMS" });
  return rows;
}

/** Confirmation for a copied value: "Comet Green #1E5B4A copied". */
export const copiedMessage = (name: string, value: string) => `${name} ${value} copied`;

const CORE_ROLES = ["primary", "text", "background", "accent"];

/** Main colors are the first color of each core role, in order. The rest are supporting. */
export function splitColors(colors: ColorAsset[]): { main: ColorAsset[]; supporting: ColorAsset[] } {
  const seen = new Set<string>();
  const main: ColorAsset[] = [];
  const supporting: ColorAsset[] = [];
  for (const c of colors) {
    const role = c.role.toLowerCase();
    if (CORE_ROLES.includes(role) && !seen.has(role)) {
      seen.add(role);
      main.push(c);
    } else supporting.push(c);
  }
  return { main, supporting };
}

/** Text-on-color pairs declared on the brand's colors, each once. */
export function colorPairs(colors: ColorAsset[]): { key: string; fg: ColorAsset; bg: ColorAsset }[] {
  const byId = new Map(colors.map((c) => [c.id, c]));
  const out = new Map<string, { key: string; fg: ColorAsset; bg: ColorAsset }>();
  for (const c of colors) {
    for (const p of c.pairings) {
      const fg = byId.get(p.fg);
      const bg = byId.get(p.bg);
      const key = `${p.fg}-on-${p.bg}`;
      if (fg && bg && !out.has(key)) out.set(key, { key, fg, bg });
    }
  }
  return [...out.values()];
}

/** Ground for logos made for dark backgrounds: the brand's darkest color, or the shell's ink. */
export function darkGround(site: Site): string {
  const colors = site.assetsOfType("color");
  return colors.sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex))[0]?.hex ?? "#0b0d10";
}

/** True for colors light enough to need a hairline against the page. */
export const isLight = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return r + g + b > 680;
};

/** Rules that apply to a page's items, in rule order: each item's governedBy and each rule's appliesTo. */
export function rulesForItems(site: Site, items: Asset[]): RuleAsset[] {
  const ids = new Set(items.map((a) => a.id));
  return site.rules.filter((r) => r.appliesTo.some((id) => ids.has(id)) || items.some((a) => a.governedBy?.includes(r.id)));
}

const STRIP_LABEL: Partial<Record<ModuleId, string>> = {
  logos: "Logo", colors: "Color", fonts: "Font", icons: "Icon", photos: "Photo", templates: "Template",
};

export interface RuleStripData {
  label: string;
  lines: string[];
  link?: { href: string; label: string };
}

const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** The rules strip at the top of a Library page, or undefined when no rule applies. */
export function ruleStrip(site: Site, module: ModuleId, items: Asset[]): RuleStripData | undefined {
  const rules = rulesForItems(site, items);
  if (!rules.length) return undefined;
  const noun = STRIP_LABEL[module] ?? "Brand";
  const chapter = site.isEnabled("guide") ? rules[0]!.chapter : undefined;
  return {
    label: `${noun} rules`,
    lines: rules.slice(0, 3).map((r) => sentence(r.title)),
    link: chapter ? { href: `${chapterHref(chapter)}/`, label: `All ${noun.toLowerCase()} rules` } : undefined,
  };
}
