// Field definitions for the inspector. Labels and help are written for the person editing the brand:
// plain words, one line of help, and no technical terms.
import type { AnyRecord, AssetType } from "../../../schemas/asset.ts";
import type { GuideChapter } from "../../../schemas/brand.ts";

export interface FieldContext {
  records: AnyRecord[];
  /** The record being edited. */
  record: AnyRecord;
  /** Brand guide chapters from the draft's brand settings. */
  chapters: GuideChapter[];
}

export type FieldKind =
  | { kind: "text"; placeholder?: string; suggestions?: (ctx: FieldContext) => string[] }
  | { kind: "textarea"; rows?: number }
  /** A list of short texts, one per line. */
  | { kind: "lines"; rows?: number }
  | { kind: "url"; warn?: (value: string) => string | undefined }
  | { kind: "select"; options: { value: string; label: string }[] }
  | { kind: "toggle"; onLabel: string }
  /** A list of words added one at a time. */
  | { kind: "chips"; numeric?: boolean }
  /** Pick other items by name. */
  | { kind: "records"; types: AssetType[] }
  | { kind: "color" }
  | { kind: "cmyk" }
  | { kind: "pairings" }
  /** One uploaded file stored in this field. */
  | { kind: "file"; accept: string[]; icon?: boolean }
  | { kind: "logo-files" }
  /** A template's Canva link and its Word, PowerPoint, and PDF files. */
  | { kind: "template-formats" }
  /** A Brand guide chapter from brand settings. */
  | { kind: "chapter" }
  | { kind: "font-files"; variant: "static" | "variable" };

export type FieldDef = FieldKind & {
  key: string;
  label: string;
  help: string;
  optional?: boolean;
  /** Shown only when this returns true for the record. */
  when?: (r: AnyRecord) => boolean;
};

const uniqueValues = (ctx: FieldContext, type: AssetType, key: string) =>
  [...new Set(ctx.records.filter((r) => r.type === type).map((r) => String((r as Record<string, unknown>)[key] ?? "")).filter(Boolean))].sort();

export const suggest = (type: AssetType, key: string, extra: string[] = []) => (ctx: FieldContext) =>
  [...new Set([...extra, ...uniqueValues(ctx, type, key)])];

/** One line on where the item is used, shown on its card and in search. */
export const helpField: FieldDef = { key: "help", kind: "textarea", rows: 3, label: "Where it's used", help: "Shown on the card and in search.", optional: true };

/** Fields every item has, shown after the section's own fields. `help` false leaves out helpField. */
export const commonFields = (opts: { rules: boolean; help?: boolean }): FieldDef[] => [
  ...(opts.help === false ? [] : [helpField]),
  { key: "keywords", kind: "chips", label: "Search words", help: "Other words people might type to find this. Press Enter after each one.", optional: true },
  {
    key: "audience",
    kind: "select",
    label: "Who can see it",
    help: "Team only hides it from people outside the company once sign-in is set up.",
    options: [
      { value: "public", label: "Everyone" },
      { value: "internal", label: "Team only" },
    ],
  },
  ...(opts.rules
    ? [{ key: "governedBy", kind: "records", types: ["rule"], label: "Rules that apply", help: "These rules are linked from this item on the site.", optional: true } as FieldDef]
    : []),
];
