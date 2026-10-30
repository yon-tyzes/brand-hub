// brand.json (spec sections 5 and 10).
import { z } from "zod";
import { fileWith, hex, id } from "./asset.ts";

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

/** A section of the Fonts page. Fonts name theirs in `group`. */
export const fontGroup = z.strictObject({ id, title: z.string().min(1), help: z.string().min(1).optional() });

/** The twelve color slots of an Office theme, in the order Office lists them (spec section 7). */
export const OFFICE_COLOR_SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"] as const;

/** Office theme (.thmx) settings. Every slot names a locked color or font from brand data. */
export const officeTheme = z.strictObject({
  /** Theme name inside Office, and the base of the file name. */
  themeName: z.string().min(1),
  colors: z.strictObject(Object.fromEntries(OFFICE_COLOR_SLOTS.map((s) => [s, id])) as Record<(typeof OFFICE_COLOR_SLOTS)[number], typeof id>),
  /** Heading and body font ids. */
  fonts: z.strictObject({ major: id, minor: id }),
});

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
      /** The full brand guide as one PDF, opened from the Brand guide landing page. The file must exist. */
      pdf: z.strictObject({ path: fileWith(".pdf"), updated: z.iso.date() }).optional(),
    })
    .default({ chapters: [] }),
  /** Per-module settings, keyed by module id. */
  modules: z
    .looseObject({
      /**
       * Icon color choices on the Icons page. Each choice is a pair, an icon color on a ground: every color in
       * `colors` on every color in `grounds` that reaches 3:1. `grounds` defaults to the lightest and darkest
       * locked colors.
       */
      icons: z.strictObject({ colors: z.array(id).default([]), grounds: z.array(id).optional() }).optional(),
      /** Sections of the Fonts page, in order, each with its own "Download all" zip. Every font then names one. */
      fonts: z
        .strictObject({
          groups: z.array(fontGroup).refine((gs) => new Set(gs.map((g) => g.id)).size === gs.length, { message: "group ids must be unique" }),
        })
        .optional(),
      /** Office theme. Without it there is no /office page (spec sections 7 and 14). */
      office: officeTheme.optional(),
    })
    .default({}),
});

export type GuideChapter = z.infer<typeof guideChapter>;
export type FontGroup = z.infer<typeof fontGroup>;
export type OfficeTheme = z.infer<typeof officeTheme>;
export type BrandTokens = z.infer<typeof brandTokens>;
export type Brand = z.infer<typeof brand>;
