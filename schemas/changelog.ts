// changelog.json, written by the serializer on publish (spec section 7): one entry per changed asset.
import { z } from "zod";
import { ASSET_TYPES, id } from "./asset.ts";

export const changelogEntry = z.strictObject({
  date: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  assetId: id,
  assetType: z.enum(ASSET_TYPES),
  change: z.enum(["added", "updated", "retired"]),
  /** Plain sentence, e.g. "Logo, horizontal navy: file replaced". */
  summary: z.string().min(1),
  /** Name of the person who published. */
  author: z.string().min(1),
  /** Revision the publish produced, when the content adapter reports one. */
  revision: z.string().min(1).optional(),
});

export const changelogFile = z.array(changelogEntry);

export type ChangelogEntry = z.infer<typeof changelogEntry>;
