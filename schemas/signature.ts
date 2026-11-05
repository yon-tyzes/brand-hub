// signature.json (spec section 14): the email signature designs. Each design is an HTML template in the brand
// folder, the fields it uses, and its color variants. The loader checks every reference (src/content/check.ts).
import { z } from "zod";
import { fileWith, id, oneLine } from "./asset.ts";

const uniqueIds = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id)).size === items.length;

export const signatureField = z.strictObject({
  id,
  label: oneLine,
  help: oneLine.optional(),
  kind: z.enum(["text", "email", "phone", "url"]).default("text"),
  required: z.boolean().default(false),
});

export const signatureVariant = z.strictObject({
  id,
  label: oneLine,
  /** Template color name to a locked color id: { "accent": "comet-green" } fills {{color.accent}}. */
  colors: z.record(id, id).refine((c) => Object.keys(c).length > 0, { message: "needs at least one color" }),
});

/** Headshot size and shape. The browser draws the photo into a PNG at twice this size. */
export const signatureHeadshot = z
  .strictObject({
    shape: z.enum(["circle", "rect"]),
    /** Display size in px, as the template's img sets it. */
    width: z.number().int().min(16).max(400),
    height: z.number().int().min(16).max(400),
  })
  .refine((h) => h.shape !== "circle" || h.width === h.height, { message: "a circle needs the same width and height" });

/** `true` is a 72px circle. */
export const DEFAULT_HEADSHOT = { shape: "circle", width: 72, height: 72 } as const satisfies z.infer<typeof signatureHeadshot>;

export const signatureDesign = z.strictObject({
  id,
  label: oneLine,
  /** HTML template with {{field-id}}, {{color.<name>}}, {{headshot}}, and {{site}} tokens. */
  template: fileWith(".html"),
  /** Field ids from `fields`, in form order. */
  fields: z.array(id).min(1),
  /** Offers an optional headshot, embedded in the copied signature: `true` for a 72px circle, or a shape and size. */
  headshot: z.union([z.boolean(), signatureHeadshot]).default(false),
  /** Color variants. The first is the default. */
  variants: z.array(signatureVariant).min(1).refine(uniqueIds, { message: "variant ids must be unique" }),
});

export const signature = z.strictObject({
  $schema: z.string().optional(),
  /** Every field any design uses. */
  fields: z.array(signatureField).min(1).refine(uniqueIds, { message: "field ids must be unique" }),
  /** Designs in picker order. The first is the default. */
  designs: z.array(signatureDesign).min(1).refine(uniqueIds, { message: "design ids must be unique" }),
});

export type SignatureHeadshot = z.infer<typeof signatureHeadshot>;
export type SignatureField = z.infer<typeof signatureField>;
export type SignatureVariant = z.infer<typeof signatureVariant>;
export type SignatureDesign = z.infer<typeof signatureDesign>;
export type Signature = z.infer<typeof signature>;

/** A design's headshot size and shape, or undefined when it offers none. */
export const headshotOf = (d: Pick<SignatureDesign, "headshot">): SignatureHeadshot | undefined =>
  d.headshot === true ? DEFAULT_HEADSHOT : d.headshot || undefined;
