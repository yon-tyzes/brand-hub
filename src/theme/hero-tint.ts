// Hero gradient colors (ENGINE_SPEC.md, section 10). The mesh never uses brand colors raw: it takes the hue
// of the brand's primary color and builds three pale tones from it in OKLCH, so every brand gets a soft,
// legible gradient. `hero.tint` replaces the tuning with exact colors.
import { hexToOklch, mix, oklchToHex } from "./color.ts";
import { SHELL_COLORS } from "./shell.ts";

/** Below this OKLCH chroma a color counts as neutral and gives no usable hue. */
export const NEUTRAL_CHROMA = 0.03;
export const CHROMA_RANGE = { min: 0.035, max: 0.07 } as const;
/** Lightness and hue offset of each tone, in order. */
export const TONES = [
  { l: 0.88, hueShift: 0 },
  { l: 0.92, hueShift: 35 },
  { l: 0.94, hueShift: -28 },
] as const;
/** The cool neutral for brands with no color above NEUTRAL_CHROMA. All three tones keep this hue. */
export const NEUTRAL = { hue: 250, chroma: 0.012 } as const;
/** How far each tone moves toward the dark background in dark theme. */
export const DARK_MIX = 0.8;

export interface HeroTintInput {
  /** tokens.color.primary in brand.json. */
  primary?: string;
  /** Hex values of the brand's colors, used when the primary is nearly neutral. */
  palette: string[];
  /** hero.tint in brand.json: up to three exact colors. */
  tint?: string[] | null;
}

export interface HeroTones {
  light: string[];
  dark: string[];
  /** The brand line in the contour preset, light and dark: the hue source itself, kept readable in dark. */
  line: { light: string; dark: string };
  /** Where the tones came from. */
  source: "tint" | "primary" | "palette" | "neutral";
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const wrap = (h: number) => ((h % 360) + 360) % 360;
const lower = (hex: string) => hex.toLowerCase();

/** The color whose hue the tones take: the primary, else the most saturated palette color. */
function hueSource(input: HeroTintInput): { hex: string; source: "primary" | "palette" } | undefined {
  if (input.primary && hexToOklch(input.primary).c >= NEUTRAL_CHROMA) return { hex: input.primary, source: "primary" };
  const best = input.palette
    .map((hex) => ({ hex, c: hexToOklch(hex).c }))
    .filter((p) => p.c >= NEUTRAL_CHROMA)
    .sort((a, b) => b.c - a.c)[0];
  return best && { hex: best.hex, source: "palette" };
}

/** Each tone moved DARK_MIX of the way toward the dark background, so the mesh stays a tint. */
export const darkTones = (light: string[]) => light.map((t) => lower(mix(t, SHELL_COLORS.bg.dark, DARK_MIX)));

/** The contour preset's brand line: the color itself in light, lifted halfway toward white in dark. */
const lineFor = (hex: string) => ({ light: lower(hex), dark: lower(mix(hex, "#ffffff", 0.5)) });

export function heroTones(input: HeroTintInput): HeroTones {
  if (input.tint?.length) {
    const light = input.tint.slice(0, 3).map(lower);
    return { light, dark: darkTones(light), line: lineFor(input.primary ?? light[0]!), source: "tint" };
  }
  const from = hueSource(input);
  let light: string[];
  if (from) {
    const { c, h } = hexToOklch(from.hex);
    // Half the source chroma keeps the tones pale; the range keeps them from going grey or loud.
    const chroma = clamp(c / 2, CHROMA_RANGE.min, CHROMA_RANGE.max);
    light = TONES.map((t) => lower(oklchToHex({ l: t.l, c: chroma, h: wrap(h + t.hueShift) })));
  } else {
    light = TONES.map((t) => lower(oklchToHex({ l: t.l, c: NEUTRAL.chroma, h: NEUTRAL.hue })));
  }
  return { light, dark: darkTones(light), line: lineFor(from?.hex ?? light[0]!), source: from?.source ?? "neutral" };
}

/** --hero-1 to --hero-3 for the hero gradient and --hero-line for the contour preset, light on :root and dark where the shell turns dark. */
export function heroCss(tones: HeroTones): string {
  const vars = (list: string[], line: string) =>
    [0, 1, 2].map((i) => `--hero-${i + 1}: ${list[i] ?? list[list.length - 1]};`).join(" ") + ` --hero-line: ${line};`;
  return [
    `:root { ${vars(tones.light, tones.line.light)} }`,
    `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${vars(tones.dark, tones.line.dark)} } }`,
    `:root[data-theme="dark"] { ${vars(tones.dark, tones.line.dark)} }`,
  ].join("\n");
}
