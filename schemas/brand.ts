// brand.json (spec section 9). Tokens feed the theme pipeline in src/theme.
import { z } from "zod";
import { hex } from "./asset.ts";

/** Colors every brand declares. Names match the CSS custom properties (--color-<name>). */
export const baseColors = z.strictObject({
  bg: hex,
  surface: hex,
  text: hex,
  muted: hex,
  primary: hex,
  link: hex,
  border: hex,
  // Derived by the pipeline when omitted (docs/DESIGN_SYSTEM.md, "Derived color defaults").
  surface2: hex.optional(),
  borderStrong: hex.optional(),
  onPrimary: hex.optional(),
  primaryHover: hex.optional(),
  focus: hex.optional(),
});

const px = z.number().nonnegative();

export const brandTokens = z.strictObject({
  color: baseColors,
  /** Dark theme colors. Omit to ship light only; the theme toggle is then not rendered. */
  dark: baseColors.optional(),
  font: z.strictObject({
    display: z.string().min(1),
    body: z.string().min(1),
    displayWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).default(500),
  }),
  radius: z.strictObject({ sm: px, md: px, lg: px, control: px.default(999) }),
  space: z
    .tuple([px, px, px, px, px, px, px, px, px])
    .refine((s) => s.every((v, i) => i === 0 || v > s[i - 1]!), { message: "space steps must increase" }),
});

export const brand = z.strictObject({
  $schema: z.string().optional(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** One line shown in the footer brand column. */
  description: z.string().min(1).optional(),
  contact: z.strictObject({ email: z.email().optional(), url: z.url().optional() }).optional(),
  tokens: brandTokens,
  /** Per-module settings, keyed by module id. Each module validates its own entry. */
  modules: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
});

export type BrandColors = z.infer<typeof baseColors>;
export type BrandTokens = z.infer<typeof brandTokens>;
export type Brand = z.infer<typeof brand>;
