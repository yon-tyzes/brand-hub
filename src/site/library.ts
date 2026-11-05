// What the Library pages show for each asset, worked out from brand data: downloads by format, color
// values by use, the rules that apply to a page, and the ground a logo sits on (spec section 6, Library pages).
// Pure: shared by the build and the editor's preview.
import type { Asset, ColorAsset, LogoAsset, RuleAsset } from "../../schemas/asset.ts";
import type { ModuleId } from "../../schemas/hub-config.ts";
import { contrastRatio, hexToRgb, relativeLuminance } from "../theme/color.ts";
import { MIN_RATIO } from "../theme/contrast.ts";
import { SHELL_COLORS } from "../theme/shell.ts";
import { fileName } from "../lib/paths.ts";
import type { Site } from "./data.ts";
import { chapterHref } from "./nav.ts";

export interface Download {
  /** The format shown beside "Download". */
  format: string;
  href: string;
  filename: string;
}

/** The largest file of an extension (several PNG widths: the widest). */
function best(l: LogoAsset, ext: string) {
  return l.files.filter((f) => f.ext === ext).sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

/** A logo's downloads, most common first: PNG, SVG, then PDF and EPS when the logo has them. */
export function logoDownloads(site: Site, l: LogoAsset): Download[] {
  return ["png", "svg", "pdf", "eps"].flatMap((ext) => {
    const f = best(l, ext);
    return f ? [{ format: ext.toUpperCase(), href: site.urlFor(f.path), filename: fileName(f.path) }] : [];
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

/**
 * The ground a logo preview sits on, from the logo's own background field and never from the theme: the brand's
 * darkest color for dark logos, the fixed light ground for the rest.
 */
export const logoGround = (site: Site, l: LogoAsset): string => (l.background === "dark" ? darkGround(site) : "var(--logo-ground-light)");

export interface IconPair {
  /** "ink-on-kiln-white". */
  id: string;
  /** "Ink on Kiln White". */
  label: string;
  icon: ColorAsset;
  ground: ColorAsset;
  /** True when the ground is light: dark text reads better on it than light text. */
  light: boolean;
  /** The shell text value (light or dark theme's) that passes 4.5:1 on the ground, for labels on the panel. */
  text: string;
  ratio: number;
}

/**
 * The Icons page's color choices (spec section 6, Icons): every icon color on every ground, kept when the pair
 * reaches 3:1, ordered by icon color and then ground. Grounds default to the lightest and darkest of `colors`.
 * Ids that are not in `colors` (not locked, or missing) are skipped.
 */
export function iconPairs(colors: ColorAsset[], settings: { colors: string[]; grounds?: string[] } | undefined): IconPair[] {
  const byId = new Map(colors.map((c) => [c.id, c]));
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const byLight = [...colors].sort((a, b) => relativeLuminance(b.hex) - relativeLuminance(a.hex));
  const grounds = settings?.grounds?.length ? pick(settings.grounds) : [...new Set([byLight[0], byLight[byLight.length - 1]])].flatMap((c) => c ?? []);
  const [dark, light] = [SHELL_COLORS.text.light, SHELL_COLORS.text.dark];
  return pick(settings?.colors ?? []).flatMap((icon) =>
    grounds.flatMap((ground) => {
      const ratio = contrastRatio(icon.hex, ground.hex);
      if (icon.id === ground.id || ratio < MIN_RATIO.graphic) return [];
      const onDark = contrastRatio(light, ground.hex);
      const onLight = contrastRatio(dark, ground.hex);
      const isLight = onLight >= onDark;
      return [{ id: `${icon.id}-on-${ground.id}`, label: `${icon.label} on ${ground.label}`, icon, ground, light: isLight, text: isLight ? dark : light, ratio }];
    }),
  );
}

/**
 * The text color of a pair's chip on the Icons page: the icon color when it reaches 4.5:1 on the ground, else the
 * darkest shell text value that does. The chip keeps the ground as its fill and the icon color for its mark.
 */
export function chipText(p: IconPair): string {
  if (p.ratio >= MIN_RATIO.text) return p.icon.hex;
  const darkFirst = [SHELL_COLORS.text.light, SHELL_COLORS.text.dark].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  return darkFirst.find((t) => contrastRatio(t, p.ground.hex) >= MIN_RATIO.text) ?? p.text;
}

/** The pair each theme opens on: the first with a light ground in light, the first with a dark ground in dark. */
export function defaultPairs(pairs: IconPair[]): { light?: IconPair; dark?: IconPair } {
  return { light: pairs.find((p) => p.light) ?? pairs[0], dark: pairs.find((p) => !p.light) ?? pairs[0] };
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
  // The chapter whose rule covers the most of the page's items; ties go to the earlier chapter.
  const order = site.brand.guide.chapters.map((c) => c.id);
  const covered = (r: RuleAsset) => items.filter((a) => r.appliesTo.includes(a.id) || a.governedBy?.includes(r.id)).length;
  const best = [...rules].sort((a, b) => covered(b) - covered(a) || order.indexOf(a.chapter) - order.indexOf(b.chapter))[0]!;
  const chapter = site.isEnabled("guide") ? best.chapter : undefined;
  return {
    label: `${noun} rules`,
    lines: rules.slice(0, 3).map((r) => sentence(r.title)),
    link: chapter ? { href: `${chapterHref(chapter)}/`, label: `All ${noun.toLowerCase()} rules` } : undefined,
  };
}
