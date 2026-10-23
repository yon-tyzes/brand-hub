// MiniSearch options shared by the build-time index and the browser. They must match for loadJSON.
import type { Options } from "minisearch";

export type SearchAction =
  /** `value`: the label is the value itself, set in the mono face. */
  | { kind: "copy"; label: string; text: string; message: string; value?: boolean }
  | { kind: "download"; label: string; href: string; filename: string }
  | { kind: "open"; label: string; href: string; external?: boolean };

export interface SearchDoc {
  id: string;
  type: string;
  typeLabel: string;
  /** Module name used to group results. */
  group: string;
  label: string;
  help?: string;
  keywords?: string;
  /** Color swatch for color results. */
  swatch?: string;
  /** Inline SVG markup for icon results. */
  svg?: string;
  /** Preview image URL for logo and template results. */
  image?: string;
  /** Ground color behind the preview image (logos made for dark backgrounds). */
  ground?: string;
  /** First action is the default (Enter). */
  actions: SearchAction[];
}

export const SEARCH_INDEX_URL = "/search-index.json";

export const searchOptions: Options<SearchDoc> = {
  fields: ["label", "keywords", "help", "typeLabel"],
  storeFields: ["type", "typeLabel", "group", "label", "help", "swatch", "svg", "image", "ground", "actions"],
  searchOptions: { boost: { label: 3, keywords: 2 }, prefix: true, fuzzy: 0.2 },
};
