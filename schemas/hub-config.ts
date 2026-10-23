// hub.config.ts in each instance (spec section 4).
import { z } from "zod";
import { ID_PATTERN } from "./asset.ts";

export const MODULE_IDS = [
  "logos", "colors", "fonts", "icons", "photos", "templates", "office",
  "boilerplate", "guide", "start", "signature", "changes",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** 0.1 module ids still accepted, and the id each one reads as (spec section 4). */
export const MODULE_ALIASES: Record<string, ModuleId> = { "whats-new": "changes" };

/** Replaces alias ids with their 0.2 id, so a 0.1 config still loads. */
const withAliases = (v: unknown) => (Array.isArray(v) ? v.map((m) => (typeof m === "string" && m in MODULE_ALIASES ? MODULE_ALIASES[m] : m)) : v);

/** A built-in adapter name or a module path, for both commands or separately for `astro dev` and `astro build`. */
const adapterSpec = z.string().min(1);
const adapterChoice = z.union([adapterSpec, z.strictObject({ dev: adapterSpec, build: adapterSpec })]);

export const hubConfig = z.strictObject({
  /** Folder name under brands/. */
  brand: z.string().regex(ID_PATTERN, "must be a kebab-case folder name"),
  modules: z
    .preprocess(withAliases, z.array(z.enum(MODULE_IDS)))
    .refine((m) => new Set(m).size === m.length, { message: "lists a module more than once" })
    .default([...MODULE_IDS]),
  search: z.strictObject({ shortcut: z.array(z.string().min(1)).default(["mod+k", "/"]) }).default({ shortcut: ["mod+k", "/"] }),
  /** When false, every page gets a noindex meta tag. */
  indexing: z.boolean().default(false),
  analytics: z.strictObject({ provider: z.literal("plausible"), domain: z.string().min(1) }).optional(),
  admin: z
    .strictObject({
      enabled: z.boolean().default(false),
      /** Content adapter: "local", "demo", or a path to a module whose default export is a ContentAdapter. */
      adapter: adapterChoice.default("local"),
      /** Auth adapter: "local", "demo", or a path to a module whose default export is an AuthAdapter. */
      auth: adapterChoice.default("local"),
    })
    .default({ enabled: false, adapter: "local", auth: "local" }),
  uploads: z.strictObject({ maxBytes: z.int().positive().default(25_000_000) }).default({ maxBytes: 25_000_000 }),
});

export type HubConfigInput = z.input<typeof hubConfig>;
export type HubConfig = z.output<typeof hubConfig>;
