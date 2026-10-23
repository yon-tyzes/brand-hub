// File names for uploads from the brand's naming patterns. Every token value is slugified; empty tokens
// drop out with their separators, so "{brand}-logo-{lockup}-{colorway}-{width}.{ext}" gives
// "pocket-comet-logo-stacked-full-color.svg" for an SVG and "...-full-color-1200.png" for a PNG.
import type { AnyRecord } from "../../schemas/asset.ts";

export const DEFAULT_PATTERNS = {
  logo: "{brand}-logo-{lockup}-{colorway}-{width}.{ext}",
  icon: "{brand}-icon-{label}.{ext}",
  template: "{brand}-template-{label}.{ext}",
  font: "{original}.{ext}",
} as const;

export type NamedType = keyof typeof DEFAULT_PATTERNS;

/** Folder for a type's uploads, inside the brand folder. */
export function folderFor(record: AnyRecord): string {
  switch (record.type) {
    case "logo": return "files/logos";
    case "icon": return "files/icons";
    case "template": return "files/templates";
    case "font": return `files/fonts/${slugify(record.family)}`;
    default: return `files/${record.type}`;
  }
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface NameInput {
  brand: string;
  record: AnyRecord;
  /** Uploaded file name, for {original} and {ext}. */
  original: string;
  width?: number;
}

export function applyPattern(pattern: string, input: NameInput): string {
  const r = input.record as Record<string, unknown>;
  const ext = (input.original.match(/\.([^.]+)$/)?.[1] ?? "").toLowerCase();
  const values: Record<string, string> = {
    brand: input.brand,
    id: r.id as string,
    label: r.label as string,
    lockup: String(r.lockup ?? ""),
    colorway: String(r.colorway ?? ""),
    family: String(r.family ?? ""),
    group: String(r.group ?? ""),
    category: String(r.category ?? ""),
    width: input.width && ext !== "svg" ? String(input.width) : "",
    original: input.original.replace(/\.[^.]+$/, ""),
  };
  const [stem = "", ...rest] = pattern.split(".{ext}");
  const name = stem
    .replace(/\{(\w+)\}/g, (_, key: string) => slugify(values[key] ?? ""))
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name || slugify(values.id ?? "file")}${rest.join("") || ""}.${ext}`;
}
