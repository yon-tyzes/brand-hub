// Validates a brand's data: schemas, unique ids, references between records, file paths, and contrast.
// Pure: reads through a BrandSource, so the build (files on disk) and the serializer (files in memory)
// apply the same rules. No Node imports.
import type { z } from "zod";
import {
  asset as assetSchema, brand as brandSchema, changelogEntry, ruleAsset,
  type AnyRecord, type Asset, type AssetType, type Brand, type ChangelogEntry, type ColorAsset, type RuleAsset,
} from "../../schemas/index.ts";
import { checkPairingContrast, checkTokenContrast, formatContrastFailure } from "../theme/contrast.ts";
import { filePaths } from "./file-paths.ts";

/** Optional per-module split files and the asset type each may hold. assets.json may hold any type. */
export const SPLIT_FILES: Record<string, AssetType> = {
  "logos.json": "logo",
  "colors.json": "color",
  "fonts.json": "font",
  "icons.json": "icon",
  "templates.json": "template",
  "photos.json": "photo-source",
  "boilerplate.json": "boilerplate",
  "documents.json": "document",
  "signature.json": "signature-layout",
};

export const DATA_FILES = ["assets.json", ...Object.keys(SPLIT_FILES), "rules.json"];

export type ProblemCode =
  | "missing-file" | "invalid-json" | "not-array" | "schema" | "wrong-file"
  | "duplicate" | "reference" | "file-not-found" | "contrast";

export interface Problem {
  /** Where it is, for people reading build output (a path, or a file name). */
  file: string;
  /** Record the problem belongs to, when there is one. */
  id?: string;
  /** Developer-facing description, used in build output. */
  problem: string;
  code: ProblemCode;
  /** Top-level field of the record, when known (e.g. "governedBy", "files"). */
  field?: string;
  /** The id or path that a reference or file problem points to. */
  ref?: string;
}

export interface BrandSource {
  /** Text of a data file by name ("brand.json", "logos.json" ...), or undefined when absent. */
  read(name: string): string | undefined;
  /** Whether a file path in the brand folder (e.g. "files/logos/x.svg") exists. */
  exists(path: string): boolean;
  /** How to show a file name or path in messages. */
  label(nameOrPath: string): string;
}

export interface CheckedContent {
  brand: Brand;
  /** Locked assets only: what public pages render. */
  assets: Asset[];
  /** Locked rules only. */
  rules: RuleAsset[];
  /** Pending assets and rules, for the "In progress" list on What's new. */
  pending: AnyRecord[];
  /** Every record in every status, for the editor. */
  all: AnyRecord[];
  /** Data file each record was read from, by id. */
  sources: Record<string, string>;
  changelog: ChangelogEntry[];
}

export const byOrder = (a: AnyRecord, b: AnyRecord) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label);

export function checkBrand(src: BrandSource): { problems: Problem[]; content?: CheckedContent } {
  const problems: Problem[] = [];
  /** Set when a file cannot be read as JSON or as an array. Cross-file checks are skipped then. */
  let unreadable = false;
  const invalidIds = new Map<string, string>();

  function readJson(name: string, required: boolean): unknown {
    const text = src.read(name);
    if (text === undefined) {
      if (required) problems.push({ file: src.label(name), problem: "file is missing", code: "missing-file" });
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      problems.push({ file: src.label(name), problem: `invalid JSON: ${(e as Error).message}`, code: "invalid-json" });
      unreadable = true;
      return undefined;
    }
  }

  function report(name: string, issues: z.core.$ZodIssue[], prefix: (string | number)[], id?: string) {
    for (const issue of issues) {
      const [first, ...rest] = [...prefix, ...issue.path];
      const where = typeof first === "number" ? [`[${first}]`, ...rest].join(".") : [first, ...rest].filter((p) => p !== undefined).join(".");
      const field = issue.path[0] === undefined ? undefined : String(issue.path[0]);
      problems.push({ file: src.label(name), id, problem: `${where ? `${where}: ` : ""}${issue.message}`, code: "schema", field });
    }
  }

  function validate<S extends z.ZodType>(name: string, schema: S, data: unknown): z.output<S> | undefined {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    report(name, result.error.issues, []);
    return undefined;
  }

  /** Validates an array file item by item, so one bad record does not hide the rest. */
  function validateItems<S extends z.ZodType>(name: string, schema: S, data: unknown): z.output<S>[] {
    if (data === undefined) return [];
    if (!Array.isArray(data)) {
      problems.push({ file: src.label(name), problem: "must be a JSON array", code: "not-array" });
      unreadable = true;
      return [];
    }
    const out: z.output<S>[] = [];
    data.forEach((item: unknown, index) => {
      const raw = (item ?? {}) as { id?: unknown; type?: unknown };
      const result = schema.safeParse(item);
      if (result.success) return out.push(result.data);
      const id = typeof raw.id === "string" ? raw.id : undefined;
      // Keep the id known, so references to an invalid record do not also report "does not exist".
      if (id) invalidIds.set(id, typeof raw.type === "string" ? raw.type : "");
      report(name, result.error.issues, [index], id);
    });
    return out;
  }

  // 1. Schema validation, file by file and record by record.
  const brandRaw = readJson("brand.json", true);
  const brand = brandRaw === undefined ? undefined : validate("brand.json", brandSchema, brandRaw);

  const records: { record: AnyRecord; file: string }[] = [];
  for (const name of ["assets.json", ...Object.keys(SPLIT_FILES)]) {
    for (const a of validateItems(name, assetSchema, readJson(name, false))) {
      const expected = SPLIT_FILES[name];
      if (expected && a.type !== expected) {
        problems.push({ file: src.label(name), id: a.id, problem: `type "${a.type}" does not belong in ${name} (expects "${expected}")`, code: "wrong-file" });
      }
      records.push({ record: a, file: name });
    }
  }
  for (const r of validateItems("rules.json", ruleAsset, readJson("rules.json", false))) {
    records.push({ record: r, file: "rules.json" });
  }
  const changelog = validateItems("changelog.json", changelogEntry, readJson("changelog.json", false));

  // 2. Unique ids across assets and rules.
  const seen = new Map<string, string>();
  for (const { record, file } of records) {
    const first = seen.get(record.id);
    if (first) problems.push({ file: src.label(file), id: record.id, problem: `duplicate id, already used in ${src.label(first)}`, code: "duplicate" });
    else seen.set(record.id, file);
  }

  // 3. References between records. Skipped when a file could not be read: every reference would look broken.
  const idsOf = (match: (type: string) => boolean) =>
    new Set([
      ...records.filter((r) => match(r.record.type)).map((r) => r.record.id),
      ...[...invalidIds].filter(([, type]) => match(type)).map(([id]) => id),
    ]);
  const ruleIds = idsOf((t) => t === "rule");
  const assetIds = idsOf((t) => t !== "rule");
  const colorIds = idsOf((t) => t === "color");
  for (const { record, file } of unreadable ? [] : records) {
    const missing = (field: string, kind: string, ref: string) =>
      problems.push({ file: src.label(file), id: record.id, problem: `${field}: ${kind} "${ref}" does not exist`, code: "reference", field: field.split(".")[0], ref });
    for (const ref of record.governedBy ?? []) if (!ruleIds.has(ref)) missing("governedBy", "rule", ref);
    if (record.type === "rule") for (const ref of record.appliesTo) if (!assetIds.has(ref)) missing("appliesTo", "asset", ref);
    if (record.type === "template") for (const ref of record.rules) if (!ruleIds.has(ref)) missing("rules", "rule", ref);
    if (record.type === "color") {
      for (const p of record.pairings) {
        if (!colorIds.has(p.fg)) missing("pairings.fg", "color", p.fg);
        if (!colorIds.has(p.bg)) missing("pairings.bg", "color", p.bg);
      }
    }
  }

  // brand.json references into the records.
  if (brand && !unreadable) {
    const at = src.label("brand.json");
    for (const ref of brand.topTasks) if (!assetIds.has(ref)) problems.push({ file: at, problem: `topTasks: asset "${ref}" does not exist`, code: "reference", field: "topTasks", ref });
    for (const ref of brand.modules.icons?.colors ?? []) if (!colorIds.has(ref)) problems.push({ file: at, problem: `modules.icons.colors: color "${ref}" does not exist`, code: "reference", field: "modules", ref });
  }

  // 4. Every file path exists.
  for (const { record, file } of records) {
    for (const { field, path } of filePaths(record)) {
      if (!src.exists(path)) {
        problems.push({ file: src.label(file), id: record.id, problem: `${field}: file not found: ${src.label(path)}`, code: "file-not-found", field: field.split(".")[0], ref: path });
      }
    }
  }

  // 5. Contrast: theme tokens and declared color pairings.
  if (brand) {
    for (const f of checkTokenContrast(brand.tokens)) problems.push({ file: src.label("brand.json"), problem: `contrast ${formatContrastFailure(f)}`, code: "contrast" });
  }
  const colors = records.map((r) => r.record).filter((r): r is ColorAsset => r.type === "color");
  for (const f of checkPairingContrast(colors)) {
    problems.push({ file: src.label(records.find((r) => r.record.id === f.owner)?.file ?? "assets.json"), id: f.owner, problem: `contrast ${formatContrastFailure(f)}`, code: "contrast", field: "pairings" });
  }

  if (problems.length || !brand) return { problems };

  const all = records.map((r) => r.record).sort(byOrder);
  return {
    problems,
    content: {
      brand,
      assets: all.filter((r): r is Asset => r.type !== "rule" && r.status === "locked"),
      rules: all.filter((r): r is RuleAsset => r.type === "rule" && r.status === "locked"),
      pending: all.filter((r) => r.status === "pending"),
      all,
      sources: Object.fromEntries(records.map((r) => [r.record.id, r.file])),
      changelog,
    },
  };
}
