// Serializer (docs/ENGINE_SPEC.md, section 7): turns the editor's draft into final brand files.
// Pure and deterministic: no network, no clock, no randomness. The caller passes the date.
//
// 1. Names uploaded files with the brand's naming pattern and points records at the final paths.
// 2. Sets `updated` on changed records and bumps `version` when a record's files change.
// 3. Writes each data file as stable JSON and adds changelog entries for changes people can see.
// 4. Validates the whole result with the loader's rules. Any problem returns errors, each tied to an
//    item id where there is one, and no change set.
import type { AnyRecord } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";
import type { ChangelogEntry } from "../../schemas/changelog.ts";
import type { ChangeSet } from "../adapters/types.ts";
import { byOrder, checkBrand, type ProblemCode } from "../content/check.ts";
import { filePaths } from "../content/file-paths.ts";
import { applyPattern, DEFAULT_PATTERNS, folderFor, type NamedType } from "./naming.ts";
import { stableJson } from "./stable-json.ts";
import { describeChanges, type RecordChange } from "./summary.ts";

export { stableJson } from "./stable-json.ts";
export { describeChanges, type RecordChange } from "./summary.ts";

export interface Upload {
  /** Provisional path the draft uses, e.g. files/logos/my-logo.svg. */
  path: string;
  /** Original file name. */
  name: string;
  content: Blob | string;
  width?: number;
}

export interface SerializeInput {
  slug: string;
  /** Revision the draft started from. */
  revision: string;
  brand: Brand;
  base: {
    records: AnyRecord[];
    /** Data file each base record lives in, by id. */
    sources: Record<string, string>;
    changelog: ChangelogEntry[];
  };
  records: AnyRecord[];
  uploads: Upload[];
  /** ISO date (YYYY-MM-DD) to stamp on changed records and changelog entries. */
  date: string;
  author: string;
}

export interface SerializeError {
  /** Item the error belongs to. Brand-wide problems carry the id they point at, or none. */
  id?: string;
  field?: string;
  code: ProblemCode;
  /** Id or path a reference or file problem points to. */
  ref?: string;
  /** Developer-facing description. The editor words its own message from code and field. */
  detail: string;
}

export type SerializeResult =
  | {
      ok: true;
      changeSet: ChangeSet;
      /** Records as written, with final file paths, dates, and versions. */
      records: AnyRecord[];
      sources: Record<string, string>;
      changelog: ChangelogEntry[];
      /** Provisional upload path to final path. */
      renamed: Record<string, string>;
      changes: RecordChange[];
    }
  | { ok: false; errors: SerializeError[] };

const DEFAULT_FILE: Record<string, string> = {
  logo: "logos.json", color: "colors.json", font: "fonts.json", icon: "icons.json", template: "templates.json",
  "photo-source": "photos.json", boilerplate: "boilerplate.json", document: "documents.json",
  "signature-layout": "signature.json", rule: "rules.json",
};

export function bumpVersion(version: string): string {
  const [major = "1", minor = "0", patch] = version.split(".");
  return patch === undefined ? `${major}.${Number(minor) + 1}` : `${major}.${Number(minor) + 1}.0`;
}

/** Rewrites one record's file paths. */
function withPaths(r: AnyRecord, map: (p: string) => string): AnyRecord {
  switch (r.type) {
    case "logo":
      return { ...r, files: r.files.map((f) => ({ ...f, path: map(f.path) })) };
    case "font":
      return { ...r, files: { static: r.files.static.map(map), variable: r.files.variable.map(map) } };
    case "icon":
      return { ...r, svgPath: map(r.svgPath) };
    case "template":
      return { ...r, thumbnail: map(r.thumbnail) };
    default:
      return r;
  }
}

const dataText = (records: AnyRecord[]) => stableJson([...records].sort(byOrder));

export function serialize(input: SerializeInput): SerializeResult {
  const { slug, brand, base, uploads, date, author } = input;
  const uploadByPath = new Map(uploads.map((u) => [u.path, u]));
  const baseById = new Map(base.records.map((r) => [r.id, r]));
  const baseFiles = new Set(base.records.flatMap((r) => filePaths(r).map((f) => f.path)));

  // 1. Final names for uploads, in a fixed order so results never depend on input order.
  const renamed: Record<string, string> = {};
  const taken = new Set(baseFiles);
  const sorted = [...input.records].sort((a, b) => a.id.localeCompare(b.id));
  for (const r of sorted) {
    for (const { path } of filePaths(r)) {
      const up = uploadByPath.get(path);
      if (!up || renamed[path]) continue;
      const pattern = brand.naming?.[r.type as NamedType] ?? DEFAULT_PATTERNS[r.type as NamedType];
      const name = pattern ? applyPattern(pattern, { brand: slug, record: r, original: up.name, width: up.width }) : up.name;
      const folder = folderFor(r);
      const dot = name.lastIndexOf(".");
      let final = `${folder}/${name}`;
      for (let n = 2; taken.has(final); n++) final = `${folder}/${name.slice(0, dot)}-${n}${name.slice(dot)}`;
      taken.add(final);
      renamed[path] = final;
    }
  }

  // 2. Final records: paths, dates, versions.
  const changes = describeChanges(base.records, input.records);
  const changed = new Map(changes.filter((c) => c.kind !== "deleted").map((c) => [c.id, c]));
  const records = sorted.map((r0) => {
    let r = withPaths(r0, (p) => renamed[p] ?? p);
    const c = changed.get(r.id);
    if (c && (c.kind === "added" || c.parts?.renamed || c.parts?.status || c.parts?.files || c.parts?.details)) r = { ...r, updated: date };
    const old = baseById.get(r.id);
    if (old && c?.parts?.files) r = { ...r, version: bumpVersion(old.version) };
    return r;
  }).sort((a, b) => byOrder(a, b) || a.id.localeCompare(b.id));

  // 3. Data files and changelog.
  const sources: Record<string, string> = {};
  for (const r of records) sources[r.id] = base.sources[r.id] ?? DEFAULT_FILE[r.type]!;
  const filesOf = (rs: AnyRecord[], src: Record<string, string>) => {
    const out = new Map<string, AnyRecord[]>();
    for (const r of rs) {
      const f = src[r.id] ?? DEFAULT_FILE[r.type]!;
      out.set(f, [...(out.get(f) ?? []), r]);
    }
    return out;
  };
  const before = filesOf(base.records, base.sources);
  const after = filesOf(records, sources);

  const visible = (id: string) => baseById.get(id)?.status === "locked" || records.find((r) => r.id === id)?.status === "locked";
  const recordFor = (id: string) => records.find((r) => r.id === id) ?? baseById.get(id)!;
  const entries: ChangelogEntry[] = changes
    .filter((c) => !c.id.startsWith("order:") && visible(c.id))
    .map((c) => {
      const r = recordFor(c.id);
      const change: ChangelogEntry["change"] = c.kind === "added" ? "added" : c.kind === "deleted" || c.parts?.status === "retired" ? "retired" : "updated";
      return { date, assetId: r.id, assetType: r.type, change, summary: c.line.replace(/^[^,]+, /, ""), author };
    });
  const changelog = [...base.changelog, ...entries].sort((a, b) => b.date.localeCompare(a.date) || a.assetId.localeCompare(b.assetId) || a.summary.localeCompare(b.summary));

  // 4. Validate everything the brand folder would hold.
  const texts = new Map<string, string>([["brand.json", stableJson(brand)], ["changelog.json", stableJson(changelog)]]);
  for (const [file, rs] of after) texts.set(file, dataText(rs));
  const referenced = new Set(records.flatMap((r) => filePaths(r).map((f) => f.path)));
  const finalUploads = new Set(Object.values(renamed));
  const { problems } = checkBrand({
    read: (name) => texts.get(name),
    exists: (path) => finalUploads.has(path) || baseFiles.has(path),
    label: (name) => name,
  });
  if (problems.length) {
    return {
      ok: false,
      errors: problems.map((p) => ({ id: p.id ?? (p.code === "reference" ? p.ref : undefined), field: p.field, code: p.code, ref: p.ref, detail: `${p.file}: ${p.problem}` })),
    };
  }

  // 5. The change set: data files that differ, uploads still in use, and files nothing points to.
  const root = `brands/${slug}/`;
  const upserts: ChangeSet["upserts"] = [];
  for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const next = after.get(file) ?? [];
    if (dataText(before.get(file) ?? []) !== dataText(next)) upserts.push({ path: root + file, content: dataText(next) });
  }
  if (entries.length) upserts.push({ path: `${root}changelog.json`, content: stableJson(changelog) });
  for (const [provisional, final] of Object.entries(renamed).sort(([, a], [, b]) => a.localeCompare(b))) {
    if (referenced.has(final)) upserts.push({ path: root + final, content: uploadByPath.get(provisional)!.content });
  }
  const deletes = [...baseFiles].filter((p) => !referenced.has(p)).sort().map((p) => root + p);

  return {
    ok: true,
    changeSet: { base: input.revision, upserts, deletes, summary: changes.map((c) => c.line) },
    records,
    sources,
    changelog,
    renamed,
    changes,
  };
}
