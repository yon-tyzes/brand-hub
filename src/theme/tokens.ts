// Builds the shell stylesheet from the engine's tokens (src/theme/shell.ts): light on :root, dark when the
// system asks for it or the theme toggle sets data-theme="dark". Brand data does not reach this file.
import { BREAKPOINTS, SHELL_COLORS, shellVars, staticVars } from "./shell.ts";

const block = (selector: string, vars: Record<string, string>, indent = "") =>
  `${indent}${selector} {\n${Object.entries(vars).map(([k, v]) => `${indent}  ${k}: ${v};`).join("\n")}\n${indent}}`;

const media = (query: string, selector: string, vars: Record<string, string>) =>
  `@media ${query} {\n${block(selector, vars, "  ")}\n}`;

const minWidth = (px: number) => `(min-width: ${px}px)`;

// ---------- TEMPORARY: 0.1 alias layer ----------
// Maps the 0.1 variable names the current components still read onto the shell tokens, so every page
// renders until the components move to the new names. Remove this section, and its use in
// buildThemeCss, when the last var(--color-*), var(--step-*), and var(--font-body) reference is gone.

/** 0.1 type ratio per viewport range. Steps -2 to 0 are fixed sizes. */
const LEGACY_TYPE_RATIOS = { base: 1.125, sm: 1.15, lg: 1.2 } as const;
const LEGACY_SM = 480;

function legacySteps(ratio: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let n = 1; n <= 7; n++) out[`--step-${n}`] = `${Math.round(ratio ** n * 100) / 100}rem`;
  return out;
}

export function legacyAliasVars(): Record<string, string> {
  return {
    "--color-bg": "var(--bg)",
    "--color-surface": "var(--surface-raised)",
    "--color-surface-2": "var(--surface-subtle)",
    "--color-text": "var(--text)",
    "--color-muted": "var(--text-secondary)",
    "--color-primary": "var(--fill-primary)",
    "--color-primary-hover": "var(--fill-primary-hover)",
    "--color-on-primary": "var(--on-primary)",
    "--color-link": "var(--text)",
    "--color-border": "var(--border)",
    "--color-border-strong": "var(--border-strong)",
    "--color-focus": "var(--focus)",
    "--color-scrim": "var(--scrim)",
    "--shadow-sm": "none",
    "--shadow-lg": "var(--shadow-popover)",
    // Logo previews on a fixed light or dark ground. Do not follow the theme.
    "--preview-light": SHELL_COLORS.bg.light,
    "--preview-dark": SHELL_COLORS.text.light,
    "--font-display": "var(--font-sans)",
    "--font-body": "var(--font-sans)",
    "--weight-display": "600",
    "--weight-regular": "400",
    "--weight-medium": "500",
    "--weight-semibold": "600",
    "--step--2": "0.75rem",
    "--step--1": "0.875rem",
    "--step-0": "1rem",
    ...legacySteps(LEGACY_TYPE_RATIOS.base),
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
    "--radius-control": "var(--radius-pill)",
    "--header-offset": "12px",
  };
}

function legacyMedia(): string[] {
  return [
    media(minWidth(LEGACY_SM), ":root", legacySteps(LEGACY_TYPE_RATIOS.sm)),
    media(minWidth(BREAKPOINTS.lg), ":root", { ...legacySteps(LEGACY_TYPE_RATIOS.lg), "--header-offset": "16px" }),
  ];
}
// ---------- end of the temporary alias layer ----------

/** Full shell stylesheet: light root, gutters per breakpoint, and the dark theme. */
export function buildThemeCss(): string {
  const dark = { "color-scheme": "dark", ...shellVars("dark") };
  return [
    block(":root", { "color-scheme": "light", ...staticVars(), ...shellVars("light"), "--gutter": "var(--space-4)", ...legacyAliasVars() }),
    media(minWidth(BREAKPOINTS.md), ":root", { "--gutter": "var(--space-5)" }),
    media(minWidth(BREAKPOINTS.lg), ":root", { "--gutter": "var(--space-8)" }),
    ...legacyMedia(),
    // The system setting applies unless the toggle chose light; the toggle's dark choice always applies.
    media("(prefers-color-scheme: dark)", ':root:not([data-theme="light"])', dark),
    block(':root[data-theme="dark"]', dark),
  ].join("\n\n") + "\n";
}
