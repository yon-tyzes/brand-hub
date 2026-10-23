// WCAG 2.2 AA contrast checks for the shell tokens and for pairings declared on color assets.
// Pairing failures fail the build (src/content/check.ts). Shell failures fail the unit tests.
import type { ColorAsset } from "../../schemas/asset.ts";
import { contrastRatio } from "./color.ts";
import { SHELL_COLORS, type ShellColor, type ShellTheme } from "./shell.ts";

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

const SURFACES = ["bg", "surface-subtle", "surface-raised"] as const;

/** Shell token pairs the components render (docs/DESIGN_SYSTEM.md, section 2). fg, bg, use. */
export const SHELL_PAIRS: [ShellColor, ShellColor, ContrastUse][] = [
  ...SURFACES.flatMap((bg) => [
    ["text", bg, "text"],
    ["text-secondary", bg, "text"],
    ["text-muted", bg, "text"],
    ["border-control", bg, "graphic"],
    ["focus", bg, "graphic"],
  ] as [ShellColor, ShellColor, ContrastUse][]),
  ["on-primary", "fill-primary", "text"],
  ["on-primary", "fill-primary-hover", "text"],
  ["success", "bg", "text"],
  ["danger", "bg", "text"],
];

export function checkShellContrast(theme: ShellTheme): ContrastFailure[] {
  const out: ContrastFailure[] = [];
  for (const [fg, bg, use] of SHELL_PAIRS) {
    const fgValue = SHELL_COLORS[fg][theme];
    const bgValue = SHELL_COLORS[bg][theme];
    const ratio = contrastRatio(fgValue, bgValue);
    if (ratio < MIN_RATIO[use]) out.push({ scope: theme, fg, bg, fgValue, bgValue, ratio, min: MIN_RATIO[use] });
  }
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
