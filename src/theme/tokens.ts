// Turns brand.json tokens into CSS custom properties for light and dark themes.
// Values and names follow docs/DESIGN_SYSTEM.md. Components read only these properties.
import type { BrandColors, BrandTokens } from "../../schemas/brand.ts";
import { mix, withAlpha } from "./color.ts";

export type ResolvedColors = Required<BrandColors>;

/** Fills the derived colors a brand did not set (DESIGN_SYSTEM.md, "Derived color defaults"). */
export function resolveColors(c: BrandColors): ResolvedColors {
  return {
    ...c,
    surface2: c.surface2 ?? mix(c.surface, c.text, 0.04),
    borderStrong: c.borderStrong ?? mix(c.border, c.text, 0.25),
    primaryHover: c.primaryHover ?? mix(c.primary, c.surface, 0.14),
    onPrimary: c.onPrimary ?? c.surface,
    focus: c.focus ?? c.link,
  };
}

export const BREAKPOINTS = { sm: 480, md: 768, lg: 992 } as const;

/** Type ratio per viewport range. Steps -2 to 0 are fixed sizes. */
export const TYPE_RATIOS = { base: 1.125, sm: 1.15, lg: 1.2 } as const;
const FIXED_STEPS: Record<number, number> = { [-2]: 0.75, [-1]: 0.875, 0: 1 };

export function typeSteps(ratio: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let n = 1; n <= 7; n++) out[`--step-${n}`] = `${round(ratio ** n)}rem`;
  return out;
}

const round = (v: number) => Math.round(v * 100) / 100;
const kebab = (s: string) => s.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);
const fontStack = (family: string, fallback: string) => `"${family.replace(/"/g, "")}", ${fallback}`;
const SANS = "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";

function colorVars(c: ResolvedColors): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) vars[`--color-${kebab(k)}`] = v;
  vars["--color-scrim"] = withAlpha(c.text, 0.45);
  vars["--shadow-sm"] = `0 1px 3px ${withAlpha(c.text, 0.08)}`;
  vars["--shadow-lg"] = `0 16px 40px ${withAlpha(c.text, 0.08)}`;
  return vars;
}

/** All custom properties for the default (light) theme at the base breakpoint. */
export function rootVars(t: BrandTokens): Record<string, string> {
  const vars: Record<string, string> = {
    ...colorVars(resolveColors(t.color)),
    // Fixed light and dark backgrounds for asset previews (logos on light or dark). Not overridden by the dark theme.
    "--preview-light": t.color.bg,
    "--preview-dark": t.color.text,
    "--font-display": fontStack(t.font.display, SANS),
    "--font-body": fontStack(t.font.body, SANS),
    "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    "--weight-display": String(t.font.displayWeight),
    "--weight-regular": "400",
    "--weight-medium": "500",
    "--weight-semibold": "600",
    "--step--2": `${FIXED_STEPS[-2]}rem`,
    "--step--1": `${FIXED_STEPS[-1]}rem`,
    "--step-0": `${FIXED_STEPS[0]}rem`,
    ...typeSteps(TYPE_RATIOS.base),
    "--leading-display": "1.05",
    "--leading-title": "1.08",
    "--leading-heading": "1.12",
    "--leading-subheading": "1.2",
    "--leading-snug": "1.3",
    "--leading-ui": "1.4",
    "--leading-body": "1.55",
    "--tracking-display": "-0.03em",
    "--tracking-title": "-0.025em",
    "--tracking-subheading": "-0.015em",
    "--tracking-minor": "-0.01em",
    "--tracking-caption": "0.01em",
    "--tracking-tag": "0.02em",
    "--radius-sm": `${t.radius.sm}px`,
    "--radius-md": `${t.radius.md}px`,
    "--radius-lg": `${t.radius.lg}px`,
    "--radius-control": `${t.radius.control}px`,
    "--duration-fast": "120ms",
    "--duration-base": "200ms",
    "--ease-out": "cubic-bezier(0.215, 0.61, 0.355, 1)",
    "--ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
    "--content-max": "1200px",
    "--gutter": "16px",
    "--header-h": "56px",
    "--header-offset": "12px",
  };
  t.space.forEach((v, i) => (vars[`--space-${i + 1}`] = `${v}px`));
  return vars;
}

const block = (selector: string, vars: Record<string, string>, indent = "") =>
  `${indent}${selector} {\n${Object.entries(vars).map(([k, v]) => `${indent}  ${k}: ${v};`).join("\n")}\n${indent}}`;

const media = (minWidth: number, vars: Record<string, string>) =>
  `@media (min-width: ${minWidth}px) {\n${block(":root", vars, "  ")}\n}`;

/** Full theme stylesheet: light root, breakpoint overrides, and the dark theme when the brand has one. */
export function buildThemeCss(t: BrandTokens): string {
  const parts = [
    block(":root", { "color-scheme": "light", ...rootVars(t) }),
    media(BREAKPOINTS.sm, typeSteps(TYPE_RATIOS.sm)),
    media(BREAKPOINTS.md, { "--gutter": "24px" }),
    media(BREAKPOINTS.lg, { ...typeSteps(TYPE_RATIOS.lg), "--gutter": "64px", "--header-offset": "16px" }),
  ];
  if (t.dark) parts.push(block(':root[data-theme="dark"]', { "color-scheme": "dark", ...colorVars(resolveColors(t.dark)) }));
  return parts.join("\n\n") + "\n";
}
