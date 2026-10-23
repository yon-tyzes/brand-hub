// Builds the shell stylesheet from the engine's tokens (src/theme/shell.ts): light on :root, dark when the
// system asks for it or the theme toggle sets data-theme="dark". Brand data does not reach this file.
import { BREAKPOINTS, shellVars, staticVars } from "./shell.ts";

const block = (selector: string, vars: Record<string, string>, indent = "") =>
  `${indent}${selector} {\n${Object.entries(vars).map(([k, v]) => `${indent}  ${k}: ${v};`).join("\n")}\n${indent}}`;

const media = (query: string, selector: string, vars: Record<string, string>) =>
  `@media ${query} {\n${block(selector, vars, "  ")}\n}`;

const minWidth = (px: number) => `(min-width: ${px}px)`;

/** Full shell stylesheet: light root, gutters per breakpoint, and the dark theme. */
export function buildThemeCss(): string {
  const dark = { "color-scheme": "dark", ...shellVars("dark") };
  return [
    block(":root", { "color-scheme": "light", ...staticVars(), ...shellVars("light"), "--gutter": "var(--space-4)" }),
    media(minWidth(BREAKPOINTS.md), ":root", { "--gutter": "var(--space-5)" }),
    media(minWidth(BREAKPOINTS.lg), ":root", { "--gutter": "var(--space-8)" }),
    // The system setting applies unless the toggle chose light; the toggle's dark choice always applies.
    media("(prefers-color-scheme: dark)", ':root:not([data-theme="light"])', dark),
    block(':root[data-theme="dark"]', dark),
  ].join("\n\n") + "\n";
}
