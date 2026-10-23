// Turns the working draft into the spec's ChangeSet (docs/ENGINE_SPEC.md, section 8) and a list of changes
// for the top bar. Paths are provisional until the serializer (prompt 05) applies the brand's naming pattern.
import type { AnyRecord } from "../../../schemas/asset.ts";
import type { BrandContent, ChangeSet } from "../../adapters/types.ts";
import { filePaths } from "../../content/file-paths.ts";
import { TYPE_LABEL } from "../../lib/labels.ts";
import { moduleForType, STATUS_LABEL } from "./modules.ts";
import { ordered, type Draft, type EditorState } from "./state.ts";

export interface RecordChange {
  id: string;
  kind: "added" | "deleted" | "changed";
  line: string;
}

const STATUS_LINE = { locked: "now live", retired: "retired", draft: `set to ${STATUS_LABEL.draft}`, pending: `set to ${STATUS_LABEL.pending}` } as const;

const pathsOf = (r: AnyRecord) => filePaths(r).map((f) => f.path).sort().join("|");
const withoutOrder = ({ order: _o, ...r }: AnyRecord) => r;

function describe(before: AnyRecord, after: AnyRecord): string[] {
  const parts: string[] = [];
  if (before.label !== after.label) parts.push(`renamed from "${before.label}"`);
  if (before.status !== after.status) parts.push(STATUS_LINE[after.status]);
  if (pathsOf(before) !== pathsOf(after)) parts.push(after.type === "logo" || after.type === "font" ? "files changed" : "file replaced");
  const rest = (r: AnyRecord) => JSON.stringify({ ...withoutOrder(r), label: 0, status: 0, files: 0, svgPath: 0, thumbnail: 0 });
  if (rest(before) !== rest(after)) parts.push("details updated");
  return parts;
}

/** One line per added, deleted, or edited record, plus one per type whose order changed. */
export function changes(base: BrandContent, draft: Draft): RecordChange[] {
  const before = new Map(base.records.map((r) => [r.id, r]));
  const after = new Map(draft.records.map((r) => [r.id, r]));
  const out: RecordChange[] = [];
  const name = (r: AnyRecord) => `${TYPE_LABEL[r.type]}, ${r.label}`;
  for (const r of draft.records) {
    const old = before.get(r.id);
    if (!old) out.push({ id: r.id, kind: "added", line: `${name(r)}: added` });
    else {
      const parts = describe(old, r);
      if (parts.length) out.push({ id: r.id, kind: "changed", line: `${name(r)}: ${parts.join(", ")}` });
    }
  }
  for (const r of base.records) if (!after.has(r.id)) out.push({ id: r.id, kind: "deleted", line: `${name(r)}: deleted` });

  const types = [...new Set(draft.records.map((r) => r.type))];
  for (const t of types) {
    const ids = (rs: AnyRecord[]) => ordered(rs, t).filter((r) => before.has(r.id) && after.has(r.id)).map((r) => r.id).join(",");
    if (ids(base.records) !== ids(draft.records)) out.push({ id: `order:${t}`, kind: "changed", line: `${moduleForType(t).label}: order changed` });
  }
  return out;
}

/** Records sorted the way the loader sorts them, as the JSON a data file holds. */
const fileContent = (records: AnyRecord[]) =>
  JSON.stringify(
    [...records].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label)),
    null,
    2,
  ) + "\n";

export function toChangeSet(state: EditorState): ChangeSet {
  const { base, present } = state;
  const root = `brands/${base.slug}/`;
  const list = changes(base, present);
  const sourceOf = (r: AnyRecord) => base.sources[r.id] ?? moduleForType(r.type).dataFile;

  // Data files touched by any change are written in full.
  const touched = new Set<string>();
  const beforeById = new Map(base.records.map((r) => [r.id, r]));
  for (const c of list) {
    if (c.id.startsWith("order:")) {
      const type = c.id.slice(6) as AnyRecord["type"];
      for (const r of present.records) if (r.type === type) touched.add(sourceOf(r));
      continue;
    }
    const r = present.records.find((x) => x.id === c.id) ?? beforeById.get(c.id)!;
    touched.add(sourceOf(r));
  }
  const upserts: ChangeSet["upserts"] = [...touched].sort().map((file) => ({
    path: root + file,
    content: fileContent(present.records.filter((r) => sourceOf(r) === file)),
  }));

  // Uploaded files that a record still points to.
  const referenced = new Set(present.records.flatMap((r) => filePaths(r).map((f) => f.path)));
  for (const f of Object.values(present.files)) if (referenced.has(f.path)) upserts.push({ path: root + f.path, content: f.blob });

  // Files from the base that nothing points to any more.
  const deletes = [...new Set(base.records.flatMap((r) => filePaths(r).map((f) => f.path)))]
    .filter((p) => !referenced.has(p))
    .sort()
    .map((p) => root + p);

  return { base: state.revision, upserts, deletes, summary: list.map((c) => c.line) };
}
