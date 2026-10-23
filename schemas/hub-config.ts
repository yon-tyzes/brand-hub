// hub.config.ts in each instance (spec section 4).
import { z } from "zod";
import { ID_PATTERN } from "./asset.ts";

export const MODULE_IDS = [
  "start", "logos", "colors", "fonts", "icons", "photos",
  "templates", "signature", "boilerplate", "guide", "whats-new",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const hubConfig = z.strictObject({
  /** Folder name under brands/. */
  brand: z.string().regex(ID_PATTERN, "must be a kebab-case folder name"),
  modules: z
    .array(z.enum(MODULE_IDS))
    .refine((m) => new Set(m).size === m.length, { message: "lists a module more than once" })
    .default([...MODULE_IDS]),
  search: z.strictObject({ shortcut: z.array(z.string().min(1)).default(["mod+k", "/"]) }).default({ shortcut: ["mod+k", "/"] }),
  /** When false, every page gets a noindex meta tag. */
  indexing: z.boolean().default(false),
  analytics: z.strictObject({ provider: z.literal("plausible"), domain: z.string().min(1) }).optional(),
  admin: z
    .strictObject({
      enabled: z.boolean().default(false),
      adapter: z.string().min(1).optional(),
      auth: z.string().min(1).optional(),
    })
    .default({ enabled: false }),
  uploads: z.strictObject({ maxBytes: z.int().positive().default(25_000_000) }).default({ maxBytes: 25_000_000 }),
});

export type HubConfigInput = z.input<typeof hubConfig>;
export type HubConfig = z.output<typeof hubConfig>;
