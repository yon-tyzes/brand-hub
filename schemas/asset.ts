// Asset records (spec section 5). Every item on the site is an Asset: shared base fields plus one
// module extension, discriminated by `type`. Rules are Assets too but live in rules.json.
import { z } from "zod";

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const id = z.string().regex(ID_PATTERN, "must be kebab-case: lowercase letters, digits, single hyphens");

/** Path to a file inside the brand folder, relative to brands/<slug>/. */
export const brandPath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith("/") && !p.includes("\\") && !p.split("/").includes(".."), {
    message: "must be relative to the brand folder, with forward slashes and no '..'",
  });

/** A full web address, or a page on the same site ("/demo-template/"). */
export const link = z.union([z.url(), z.string().regex(/^\/(?!\/)\S*$/, "must be a page on this site that starts with /")]);

export const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be a 6-digit hex color like #0F3D6B");

const fileWith = (ext: string) => brandPath.refine((p) => p.toLowerCase().endsWith(ext), { message: `must point to a ${ext} file` });

const isoDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
const oneLine = z.string().min(1).regex(/^[^\n]*$/, "must be a single line");

export const STATUSES = ["locked", "pending", "draft", "retired"] as const;
export const status = z.enum(STATUSES);

export const ASSET_TYPES = [
  "logo", "color", "font", "icon", "template", "photo-source",
  "boilerplate", "document", "rule", "signature-layout",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const baseAsset = {
  id,
  label: oneLine,
  help: oneLine.optional(),
  status,
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, "must look like 1.0 or 1.0.0"),
  updated: isoDate,
  audience: z.enum(["public", "internal"]),
  governedBy: z.array(id).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  order: z.int().nonnegative().optional(),
};

const channel = z.int().min(0).max(255);
const percent = z.number().min(0).max(100);

export const logoAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("logo"),
  lockup: z.string().min(1),
  colorway: z.string().min(1),
  background: z.enum(["light", "dark"]),
  files: z
    .array(
      z.strictObject({
        /** svg and png for screens, pdf and eps for print and sign vendors. */
        ext: z.string().regex(/^[a-z0-9]+$/, "lowercase extension without the dot"),
        path: brandPath,
        width: z.int().positive().optional(),
      }),
    )
    .min(1),
});

export const colorPairing = z.strictObject({
  fg: id,
  bg: id,
  /** text: 4.5:1, large-text and graphic: 3:1 (WCAG 2.2 AA). */
  use: z.enum(["text", "large-text", "graphic"]).default("text"),
});

export const colorAsset = z
  .strictObject({
    ...baseAsset,
    type: z.literal("color"),
    hex,
    rgb: z.tuple([channel, channel, channel]),
    cmyk: z.tuple([percent, percent, percent, percent]).optional(),
    pms: z.string().min(1).optional(),
    role: z.string().min(1),
    pairings: z.array(colorPairing).default([]),
  })
  .refine(
    (c) => {
      // A malformed hex is already reported by its own check.
      if (!/^#[0-9A-Fa-f]{6}$/.test(c.hex)) return true;
      const n = parseInt(c.hex.slice(1), 16);
      return c.rgb[0] === (n >> 16) && c.rgb[1] === ((n >> 8) & 255) && c.rgb[2] === (n & 255);
    },
    { message: "rgb does not match hex", path: ["rgb"] },
  );

export const fontAsset = z
  .strictObject({
    ...baseAsset,
    type: z.literal("font"),
    family: z.string().min(1),
    role: z.string().min(1),
    weights: z.array(z.int().min(1).max(1000)).min(1),
    files: z.strictObject({
      static: z.array(brandPath).default([]),
      variable: z.array(brandPath).default([]),
    }),
    license: z.string().min(1),
    install: z.string().min(1),
  })
  .refine((f) => f.files.static.length + f.files.variable.length > 0, {
    message: "needs at least one static or variable file",
    path: ["files"],
  });

export const iconAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("icon"),
  svgPath: brandPath.refine((p) => p.endsWith(".svg"), { message: "must point to an .svg file" }),
  group: z.string().min(1),
  pinned: z.boolean(),
  source: z.string().min(1),
  standIn: z.boolean().optional(),
});

export const templateAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("template"),
  category: z.string().min(1),
  /** Where to get the template. At least one is required (checked by the loader). Canva is the recommended format. */
  formats: z
    .strictObject({
      /** Canva share link. */
      canva: z.url().optional(),
      docx: fileWith(".docx").optional(),
      pptx: fileWith(".pptx").optional(),
      pdf: fileWith(".pdf").optional(),
    })
    .default({}),
  /** 0.1 template link, read as a single "Open template" link with a build warning until moved to `formats`. */
  url: link.optional(),
  thumbnail: brandPath,
  rules: z.array(id).default([]),
});

export const photoSourceAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("photo-source"),
  provider: z.enum(["dropbox", "drive", "sharepoint", "url"]),
  url: z.url(),
  access: z.enum(["open", "sign-in"]),
  /** Who can open a sign-in source, e.g. "Anyone with a company account". */
  accessGroup: z.string().min(1).optional(),
  guidelines: z.array(z.string().min(1)).default([]),
});

export const boilerplateAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("boilerplate"),
  lengths: z.strictObject({ short: z.string().min(1), medium: z.string().min(1), long: z.string().min(1) }),
  context: z.string().min(1),
});

export const documentAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("document"),
});

export const signatureLayoutAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("signature-layout"),
  name: z.string().min(1),
  html: z.string().min(1),
  fields: z
    .array(
      z.strictObject({
        key: id,
        label: oneLine,
        required: z.boolean().default(false),
      }),
    )
    .min(1),
  fixed: z.strictObject({ address: z.string().min(1), website: z.url() }),
});

export const ruleAsset = z.strictObject({
  ...baseAsset,
  type: z.literal("rule"),
  title: z.string().min(1),
  /** Brand guide chapter id from guide.chapters in brand.json. */
  chapter: id,
  body: z.string().min(1),
  do: z.array(z.string().min(1)).default([]),
  dont: z.array(z.string().min(1)).default([]),
  appliesTo: z.array(id).default([]),
});

/** Any record allowed in assets.json or a per-module split file. Rules belong in rules.json. */
export const asset = z.discriminatedUnion("type", [
  logoAsset, colorAsset, fontAsset, iconAsset, templateAsset, photoSourceAsset,
  boilerplateAsset, documentAsset, signatureLayoutAsset,
]);

export const assetsFile = z.array(asset);
export const rulesFile = z.array(ruleAsset);

export type Status = z.infer<typeof status>;
export type LogoAsset = z.infer<typeof logoAsset>;
export type ColorAsset = z.infer<typeof colorAsset>;
export type ColorPairing = z.infer<typeof colorPairing>;
export type FontAsset = z.infer<typeof fontAsset>;
export type IconAsset = z.infer<typeof iconAsset>;
export type TemplateAsset = z.infer<typeof templateAsset>;
export type TemplateFormat = keyof TemplateAsset["formats"];
export type PhotoSourceAsset = z.infer<typeof photoSourceAsset>;
export type BoilerplateAsset = z.infer<typeof boilerplateAsset>;
export type DocumentAsset = z.infer<typeof documentAsset>;
export type SignatureLayoutAsset = z.infer<typeof signatureLayoutAsset>;
export type RuleAsset = z.infer<typeof ruleAsset>;
export type Asset = z.infer<typeof asset>;
export type AnyRecord = Asset | RuleAsset;
