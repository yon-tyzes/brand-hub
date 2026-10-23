// brand.json (spec sections 5 and 10).
import { z } from "zod";
import { hex, id } from "./asset.ts";

/**
 * Brand values the shell reads (spec section 10). The engine owns every other visual value; the 0.1 shell keys
 * (other tokens.color entries, tokens.font, tokens.radius, tokens.space, tokens.dark) are removed with a
 * warning before validation (src/content/legacy.ts).
 */
export const brandTokens = z.strictObject({
  color: z.strictObject({
    /** The brand's main color. The hero gradient takes its hue. */
    primary: hex,
  }),
});

export const guideChapter = z.strictObject({ id, title: z.string().min(1) });

export const brand = z.strictObject({
  $schema: z.string().optional(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** One line shown in the footer brand column. */
  description: z.string().min(1).optional(),
  contact: z.strictObject({ email: z.email().optional(), url: z.url().optional() }).optional(),
  tokens: brandTokens,
  /**
   * File name patterns for uploads, by asset type, e.g. "{brand}-logo-{lockup}-{colorway}.{ext}".
   * Tokens: {brand} {id} {label} {lockup} {colorway} {width} {family} {group} {category} {original} {ext}.
   * Omitted types use the engine defaults (src/serializer/naming.ts).
   */
  naming: z
    .strictObject({
      logo: z.string().min(1).optional(),
      icon: z.string().min(1).optional(),
      template: z.string().min(1).optional(),
      font: z.string().min(1).optional(),
    })
    .default({}),
  /** Home hero settings. */
  hero: z
    .strictObject({
      /** Up to three exact gradient colors. Replaces the tuning from tokens.color.primary; use only when asked for a specific look. */
      tint: z.array(hex).min(1).max(3).nullable().optional(),
    })
    .default({}),
  /** Asset ids in the home page's "Quick downloads" row, in order. Must be locked. */
  quickDownloads: z.array(id).default([]),
  /** Brand guide chapters, in reading order. Every rule names one in `chapter`. */
  guide: z
    .strictObject({
      chapters: z
        .array(guideChapter)
        .default([])
        .refine((cs) => new Set(cs.map((c) => c.id)).size === cs.length, { message: "chapter ids must be unique" }),
    })
    .default({ chapters: [] }),
  /** Per-module settings, keyed by module id. */
  modules: z
    .looseObject({
      /** Color asset ids offered when recoloring icons. The first is the default. */
      icons: z.strictObject({ colors: z.array(id).default([]) }).optional(),
    })
    .default({}),
});

export type GuideChapter = z.infer<typeof guideChapter>;
export type BrandTokens = z.infer<typeof brandTokens>;
export type Brand = z.infer<typeof brand>;
