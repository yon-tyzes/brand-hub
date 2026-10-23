// Field definitions for the inspector. Labels and help are written for the person editing the brand:
// plain words, one line of help, and no technical terms.
import type { AnyRecord, AssetType } from "../../../schemas/asset.ts";

export interface FieldContext {
  records: AnyRecord[];
  /** The record being edited. */
  record: AnyRecord;
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
  | { kind: "font-files"; variant: "static" | "variable" };

export type FieldDef = FieldKind & {
  key: string;
  label: string;
  help: string;
  optional?: boolean;
};

const uniqueValues = (ctx: FieldContext, type: AssetType, key: string) =>
  [...new Set(ctx.records.filter((r) => r.type === type).map((r) => String((r as Record<string, unknown>)[key] ?? "")).filter(Boolean))].sort();

export const suggest = (type: AssetType, key: string, extra: string[] = []) => (ctx: FieldContext) =>
  [...new Set([...extra, ...uniqueValues(ctx, type, key)])];

/** Fields every item has, shown after the section's own fields. */
export const commonFields = (opts: { rules: boolean }): FieldDef[] => [
  { key: "help", kind: "text", label: "When to use it", help: "One line shown under the name, like “For dark backgrounds.”", optional: true },
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
