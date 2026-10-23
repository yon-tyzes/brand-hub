// Messages between the editor and the preview frame (same origin).
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { Brand } from "../../../schemas/brand.ts";
import type { ChangelogEntry } from "../../../schemas/changelog.ts";
import type { PageId } from "../../site/Page.tsx";

export interface PreviewData {
  brand: Brand;
  records: AnyRecord[];
  changelog: ChangelogEntry[];
  /** Object URLs for files uploaded in this session, by path. Other paths use /files. */
  urls: Record<string, string>;
  svgs: Record<string, string>;
}

export type ToPreview = { type: "bh-preview"; page: PageId; data: PreviewData };
export type FromPreview = { type: "bh-preview-ready" } | { type: "bh-preview-navigate"; page: PageId };
