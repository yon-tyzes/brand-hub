// Shell tokens (docs/DESIGN_SYSTEM.md). The engine owns these values in light and dark; brand data never
// sets them. Names match the CSS custom properties: `bg` is `var(--bg)`.

export type ShellTheme = "light" | "dark";

/** Color tokens by name, light and dark (DESIGN_SYSTEM.md, section 2). */
export const SHELL_COLORS = {
  bg: { light: "#ffffff", dark: "#0a0b0d" },
  "surface-subtle": { light: "#f5f6f8", dark: "#111317" },
  "surface-raised": { light: "#ffffff", dark: "#16181d" },
  border: { light: "#e6e8ec", dark: "#23262d" },
  "border-strong": { light: "#cdd1d8", dark: "#343841" },
  "border-control": { light: "#7f858f", dark: "#5f6570" },
  text: { light: "#0b0d10", dark: "#f2f3f5" },
  "text-secondary": { light: "#4e545e", dark: "#a6acb6" },
  "text-muted": { light: "#6a707b", dark: "#8a909b" },
  "fill-primary": { light: "#0b0d10", dark: "#f2f3f5" },
  "fill-primary-hover": { light: "#2a2e35", dark: "#d9dce1" },
  "on-primary": { light: "#ffffff", dark: "#0b0d10" },
  focus: { light: "#2f6bff", dark: "#7aa2ff" },
  success: { light: "#1a7f52", dark: "#4cc38a" },
  danger: { light: "#c93a3a", dark: "#f07070" },
  scrim: { light: "rgba(10, 11, 13, 0.45)", dark: "rgba(0, 0, 0, 0.6)" },
  "glass-fill": { light: "rgba(255, 255, 255, 0.6)", dark: "rgba(22, 24, 29, 0.6)" },
  "glass-fill-strong": { light: "rgba(255, 255, 255, 0.72)", dark: "rgba(22, 24, 29, 0.75)" },
  "glass-border": { light: "rgba(255, 255, 255, 0.7)", dark: "rgba(255, 255, 255, 0.08)" },
  "glass-highlight": { light: "rgba(255, 255, 255, 0.75)", dark: "rgba(255, 255, 255, 0.06)" },
  "shadow-popover": {
    light: "0 1px 2px rgba(11, 13, 16, 0.06), 0 12px 32px rgba(11, 13, 16, 0.10)",
    dark: "0 1px 2px rgba(0, 0, 0, 0.5), 0 12px 32px rgba(0, 0, 0, 0.55)",
  },
} as const satisfies Record<string, Record<ShellTheme, string>>;

export type ShellColor = keyof typeof SHELL_COLORS;

/** Values that are the same in both themes. */
export const SHELL_STATIC = {
  "font-sans": '"Mona Sans", system-ui, sans-serif',
  "font-mono": '"Martian Mono", ui-monospace, Menlo, monospace',
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-5": "24px",
  "space-6": "32px",
  "space-7": "48px",
  "space-8": "64px",
  "space-9": "96px",
  "radius-sm": "6px",
  "radius-md": "10px",
  "radius-lg": "14px",
  "radius-pill": "999px",
  "duration-fast": "120ms",
  "duration-base": "200ms",
  "duration-slow": "320ms",
  "ease-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "content-max": "1200px",
  "header-h": "56px",
  "sidebar-w": "248px",
  "reading-max": "68ch",
  "glass-blur": "14px",
  "glass-saturate": "1.4",
} as const;

/** Type styles (DESIGN_SYSTEM.md, section 3). Each becomes --<name>-size, -leading, -weight, -tracking. */
export const TYPE_STYLES = {
  "display-xl": { family: "sans", size: "56px", leading: "1.02", weight: "600", tracking: "-0.03em" },
  display: { family: "sans", size: "40px", leading: "1.05", weight: "600", tracking: "-0.03em" },
  h1: { family: "sans", size: "32px", leading: "1.1", weight: "600", tracking: "-0.025em" },
  h2: { family: "sans", size: "24px", leading: "1.2", weight: "600", tracking: "-0.02em" },
  h3: { family: "sans", size: "18px", leading: "1.3", weight: "600", tracking: "-0.01em" },
  "body-lg": { family: "sans", size: "18px", leading: "1.55", weight: "400", tracking: "0" },
  body: { family: "sans", size: "16px", leading: "1.55", weight: "400", tracking: "0" },
  small: { family: "sans", size: "14px", leading: "1.5", weight: "400", tracking: "0" },
  label: { family: "sans", size: "14px", leading: "1.4", weight: "500", tracking: "0" },
  caption: { family: "sans", size: "12px", leading: "1.4", weight: "500", tracking: "0.01em" },
  value: { family: "mono", size: "13px", leading: "1.5", weight: "400", tracking: "0" },
  "value-sm": { family: "mono", size: "11px", leading: "1.5", weight: "400", tracking: "0" },
} as const;

export const BREAKPOINTS = { md: 768, lg: 992 } as const;

/** Every shell custom property for one theme. */
export function shellVars(theme: ShellTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, v] of Object.entries(SHELL_COLORS)) vars[`--${name}`] = v[theme];
  return vars;
}

export function staticVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, v] of Object.entries(SHELL_STATIC)) vars[`--${name}`] = v;
  for (const [name, s] of Object.entries(TYPE_STYLES)) {
    vars[`--${name}-size`] = s.size;
    vars[`--${name}-leading`] = s.leading;
    vars[`--${name}-weight`] = s.weight;
    vars[`--${name}-tracking`] = s.tracking;
  }
  return vars;
}
