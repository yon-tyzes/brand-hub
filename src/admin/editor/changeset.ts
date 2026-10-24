// Bridges the editor's draft and the serializer: the change list for the top bar, and the final change set.
import type { AnyRecord } from "../../../schemas/asset.ts";
import { filePaths } from "../../content/file-paths.ts";
import { describeBrandChange, describeChanges, serialize, type RecordChange, type SerializeError, type SerializeResult } from "../../serializer/index.ts";
import type { BrandContent } from "../../adapters/types.ts";
import type { Draft, EditorState } from "./state.ts";

export type { RecordChange, SerializeError };

/** One line for brand settings, one per added, deleted, or edited record, and one per section whose order changed. */
export const changes = (base: BrandContent, draft: Draft): RecordChange[] => {
  const brand = draft.brand && describeBrandChange(base.brand, draft.brand);
  return [...(brand ? [brand] : []), ...describeChanges(base.records, draft.records)];
};

/** Today's date in the editor's time zone, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Runs the serializer on the draft: final names, dates, validation, and the spec's ChangeSet. */
export function serializeDraft(state: EditorState, author: string, date: string): SerializeResult {
  const { base, present } = state;
  const referenced = new Set(present.records.flatMap((r: AnyRecord) => filePaths(r).map((f) => f.path)));
  const uploads = Object.values(present.files)
    .filter((f) => referenced.has(f.path))
    .map((f) => ({ path: f.path, name: f.name, content: f.blob, width: f.width }));
  return serialize({
    slug: base.slug,
    revision: state.revision,
    brand: present.brand ?? base.brand,
    base: { brand: base.brand, records: base.records, sources: base.sources, changelog: base.changelog },
    records: present.records,
    uploads,
    date,
    author,
  });
}

/**
 * Applies this draft's changes on top of newer content from someone else: records the draft added or
 * edited replace theirs, records the draft deleted stay deleted, and everything else is theirs.
 */
export function rebase(state: EditorState, remote: BrandContent): AnyRecord[] {
  const mine = changes(state.base, state.present).filter((c) => !c.id.startsWith("brand:"));
  const byId = new Map(remote.records.map((r) => [r.id, r]));
  const present = new Map(state.present.records.map((r) => [r.id, r]));
  for (const c of mine) {
    if (c.id.startsWith("order:")) {
      const type = c.id.slice(6);
      for (const r of state.present.records) if (r.type === type && byId.has(r.id)) byId.set(r.id, { ...byId.get(r.id)!, order: r.order } as AnyRecord);
    } else if (c.kind === "deleted") byId.delete(c.id);
    else byId.set(c.id, present.get(c.id)!);
  }
  return [...byId.values()];
}
