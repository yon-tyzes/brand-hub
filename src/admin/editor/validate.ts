// Runs a record through its zod schema and returns one plain-language message per field.
// Messages never mention data formats, paths, or field keys.
import type { z } from "zod";
import {
  boilerplateAsset, colorAsset, documentAsset, fontAsset, iconAsset, logoAsset, photoSourceAsset,
  ruleAsset, signatureLayoutAsset, templateAsset, type AnyRecord,
} from "../../../schemas/asset.ts";

const SCHEMAS: Record<AnyRecord["type"], z.ZodType> = {
  logo: logoAsset, color: colorAsset, font: fontAsset, icon: iconAsset, template: templateAsset,
  "photo-source": photoSourceAsset, boilerplate: boilerplateAsset, document: documentAsset,
  rule: ruleAsset, "signature-layout": signatureLayoutAsset,
};

/** Messages by top-level field name ("label", "url", "files" ...). */
export type FieldErrors = Record<string, string>;

function message(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "too_small":
      return issue.origin === "array" ? "Add at least one." : "This can't be empty.";
    case "invalid_type":
      return "This can't be empty.";
    case "invalid_format":
      if (issue.format === "url") return "Enter a full web address that starts with https://";
      if (issue.format === "email") return "Enter an email address.";
      return "Check the format of this value.";
    case "invalid_union":
      return issue.errors.flat().some((e) => e.code === "invalid_format" && e.format === "url")
        ? "Enter a full web address that starts with https://, or a page on this site that starts with /"
        : "Check this value.";
    case "invalid_value":
      return "Choose one of the options.";
    case "too_big":
      return "This value is too large.";
    default:
      return issue.message.startsWith("must") || issue.message.startsWith("needs") ? sentence(issue.message) : "Check this value.";
  }
}

const sentence = (m: string) => {
  const text = m
    .replace(/^must be a 6-digit hex color like (#[0-9A-F]+)/i, "Enter a 6-digit hex like $1")
    .replace(/^needs at least one static or variable file/, "Add at least one font file")
    .replace(/^must point to an \.svg file/, "Upload an SVG file");
  return text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith(".") ? "" : ".");
};

export function validate(record: AnyRecord): FieldErrors {
  const result = SCHEMAS[record.type].safeParse(record);
  if (result.success) return {};
  const out: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "label");
    out[key] ??= message(issue);
  }
  return out;
}
