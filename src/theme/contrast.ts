// WCAG 2.2 AA contrast checks for theme tokens and for pairings declared on color assets.
// The build fails on any result returned here (see src/content/load.ts).
import type { BrandTokens } from "../../schemas/brand.ts";
import type { ColorAsset } from "../../schemas/asset.ts";
import { contrastRatio } from "./color.ts";
import { resolveColors, type ResolvedColors } from "./tokens.ts";

export const MIN_RATIO = { text: 4.5, "large-text": 3, graphic: 3 } as const;
export type ContrastUse = keyof typeof MIN_RATIO;

export interface ContrastFailure {
  /** "light", "dark", or "color assets". */
  scope: string;
  fg: string;
  bg: string;
  fgValue: string;
  bgValue: string;
  ratio: number;
  min: number;
  /** Color asset that declares the pairing (pairing checks only). */
  owner?: string;
}

/** Token pairs the components render (docs/DESIGN_SYSTEM.md). fg, bg, use. */
export const TOKEN_PAIRS: [keyof ResolvedColors, keyof ResolvedColors, ContrastUse][] = [
  ["text", "bg", "text"],
  ["text", "surface", "text"],
  ["text", "surface2", "text"],
  ["muted", "bg", "text"],
  ["muted", "surface", "text"],
  ["muted", "surface2", "text"],
  ["link", "bg", "text"],
  ["link", "surface", "text"],
  ["onPrimary", "primary", "text"],
  ["onPrimary", "primaryHover", "text"],
  ["focus", "bg", "graphic"],
  ["focus", "surface", "graphic"],
];

function checkColors(scope: string, colors: ResolvedColors): ContrastFailure[] {
  const out: ContrastFailure[] = [];
  for (const [fg, bg, use] of TOKEN_PAIRS) {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    if (ratio < MIN_RATIO[use]) out.push({ scope, fg, bg, fgValue: colors[fg], bgValue: colors[bg], ratio, min: MIN_RATIO[use] });
  }
  return out;
}

export function checkTokenContrast(tokens: BrandTokens): ContrastFailure[] {
  const out = checkColors("light", resolveColors(tokens.color));
  if (tokens.dark) out.push(...checkColors("dark", resolveColors(tokens.dark)));
  return out;
}

/** Checks `pairings` on color assets. Unknown ids are reported by the loader's reference check, not here. */
export function checkPairingContrast(colors: ColorAsset[]): ContrastFailure[] {
  const byId = new Map(colors.map((c) => [c.id, c]));
  const out: ContrastFailure[] = [];
  for (const c of colors) {
    for (const p of c.pairings) {
      const fg = byId.get(p.fg);
      const bg = byId.get(p.bg);
      if (!fg || !bg) continue;
      const ratio = contrastRatio(fg.hex, bg.hex);
      const min = MIN_RATIO[p.use];
      if (ratio < min) out.push({ scope: `color assets (${c.id})`, fg: p.fg, bg: p.bg, fgValue: fg.hex, bgValue: bg.hex, ratio, min, owner: c.id });
    }
  }
  return out;
}

export function formatContrastFailure(f: ContrastFailure): string {
  return `${f.scope}: ${f.fg} ${f.fgValue} on ${f.bg} ${f.bgValue} is ${f.ratio.toFixed(2)}:1, needs ${f.min}:1`;
}
