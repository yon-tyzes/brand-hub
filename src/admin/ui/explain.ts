// Plain-language explanations of serializer errors, for the item they belong to.
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { SerializeError } from "../../serializer/index.ts";

const FIELD = { governedBy: "Rules that apply", rules: "Template rules", appliesTo: "Applies to", pairings: "Approved pairings" } as const;

export function explain(e: SerializeError, names: Map<string, string>): string {
  const ref = e.ref ? (names.get(e.ref) ?? "an item that was deleted") : "";
  switch (e.code) {
    case "schema":
      return "Some details are missing or need a fix. Check the fields marked below.";
    case "duplicate":
      return "Another item uses the same name. Rename one of them.";
    case "file-not-found":
      return "A file this item needs is missing. Upload it again.";
    case "contrast":
      return "An approved pairing is too hard to read. Change the colors or remove the pairing.";
    case "reference":
      if (e.field === "topTasks") return `${ref} is a top task on the home page, so it can't be deleted. Restore it.`;
      if (e.field === "modules") return `${ref} is an icon color, so it can't be deleted. Restore it.`;
      if (e.field === "pairings") return `An approved pairing uses ${ref}, which was deleted. Remove that pairing.`;
      return `${FIELD[e.field as keyof typeof FIELD] ?? "This item"} includes ${ref}, which was deleted. Remove it there.`;
    default:
      return "Something in this item needs a fix before saving.";
  }
}

/** Messages by item id. Errors about a deleted item are listed under that item's id. */
export function issuesById(errors: SerializeError[], records: AnyRecord[], base: AnyRecord[]): Map<string, string[]> {
  const names = new Map([...base, ...records].map((r) => [r.id, r.label]));
  const out = new Map<string, string[]>();
  for (const e of errors) {
    const key = e.id ?? "";
    const text = explain(e, names);
    out.set(key, [...new Set([...(out.get(key) ?? []), text])]);
  }
  return out;
}
