// Reads a brand folder, validates every file against the schemas, and enforces cross-file integrity.
// Any problem throws BrandDataError, which fails `astro build` and `pnpm check` with one line per problem.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { z } from "zod";
import {
  assetsFile, brand as brandSchema, changelogFile, rulesFile,
  type AnyRecord, type Asset, type AssetType, type Brand, type ChangelogEntry, type ColorAsset, type RuleAsset,
} from "../../schemas/index.ts";
import { checkPairingContrast, checkTokenContrast, formatContrastFailure } from "../theme/contrast.ts";

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

export interface Problem {
  file: string;
  id?: string;
  problem: string;
}

export class BrandDataError extends Error {
  readonly problems: Problem[];
  constructor(brandDir: string, problems: Problem[]) {
    const lines = problems.map((p) => `  ${p.file}${p.id ? `  id "${p.id}"` : ""}: ${p.problem}`);
    super(`Brand data in ${rel(brandDir)} has ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n${lines.join("\n")}`);
    this.name = "BrandDataError";
    this.problems = problems;
  }
}

export interface BrandContent {
  dir: string;
  brand: Brand;
  /** Locked assets only: what public pages render. */
  assets: Asset[];
  /** Locked rules only. */
  rules: RuleAsset[];
  /** Pending assets and rules, for the "In progress" list on What's new. */
  pending: AnyRecord[];
  /** Every record in every status, for the editor. */
  all: AnyRecord[];
  changelog: ChangelogEntry[];
}

const rel = (p: string) => relative(process.cwd(), p) || ".";

const byOrder = (a: AnyRecord, b: AnyRecord) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label);

/** File paths an asset points to, relative to the brand folder. */
function filePaths(a: AnyRecord): { field: string; path: string }[] {
  switch (a.type) {
    case "logo":
      return a.files.map((f, i) => ({ field: `files.${i}.path`, path: f.path }));
    case "font":
      return [
        ...a.files.static.map((p, i) => ({ field: `files.static.${i}`, path: p })),
        ...a.files.variable.map((p, i) => ({ field: `files.variable.${i}`, path: p })),
      ];
    case "icon":
      return [{ field: "svgPath", path: a.svgPath }];
    case "template":
      return [{ field: "thumbnail", path: a.thumbnail }];
    default:
      return [];
  }
}

export function loadBrand(brandDir: string): BrandContent {
  const problems: Problem[] = [];

  if (!existsSync(brandDir) || !statSync(brandDir).isDirectory()) {
    throw new BrandDataError(brandDir, [{ file: rel(brandDir), problem: "brand folder not found" }]);
  }

  function readJson(name: string, required: boolean): unknown {
    const path = join(brandDir, name);
    if (!existsSync(path)) {
      if (required) problems.push({ file: rel(path), problem: "file is missing" });
      return undefined;
    }
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      problems.push({ file: rel(path), problem: `invalid JSON: ${(e as Error).message}` });
      return undefined;
    }
  }

  function validate<S extends z.ZodType>(name: string, schema: S, data: unknown): z.output<S> | undefined {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    for (const issue of result.error.issues) {
      const [index, ...rest] = issue.path;
      const item = typeof index === "number" && Array.isArray(data) ? (data[index] as { id?: unknown }) : undefined;
      const id = typeof item?.id === "string" ? item.id : undefined;
      const where = typeof index === "number" ? [`[${index}]`, ...rest].join(".") : issue.path.join(".");
      problems.push({ file: rel(join(brandDir, name)), id, problem: `${where ? `${where}: ` : ""}${issue.message}` });
    }
    return undefined;
  }

  // 1. Schema validation, file by file.
  const brand = validate("brand.json", brandSchema, readJson("brand.json", true));

  const records: { record: AnyRecord; file: string }[] = [];
  for (const name of ["assets.json", ...Object.keys(SPLIT_FILES)]) {
    const raw = readJson(name, false);
    if (raw === undefined) continue;
    const items = validate(name, assetsFile, raw);
    for (const a of items ?? []) {
      const expected = SPLIT_FILES[name];
      if (expected && a.type !== expected) {
        problems.push({ file: rel(join(brandDir, name)), id: a.id, problem: `type "${a.type}" does not belong in ${name} (expects "${expected}")` });
      }
      records.push({ record: a, file: name });
    }
  }
  for (const r of validate("rules.json", rulesFile, readJson("rules.json", false) ?? []) ?? []) {
    records.push({ record: r, file: "rules.json" });
  }
  const changelog = validate("changelog.json", changelogFile, readJson("changelog.json", false) ?? []) ?? [];

  // 2. Unique ids across assets and rules.
  const seen = new Map<string, string>();
  for (const { record, file } of records) {
    const first = seen.get(record.id);
    if (first) problems.push({ file: rel(join(brandDir, file)), id: record.id, problem: `duplicate id, already used in ${rel(join(brandDir, first))}` });
    else seen.set(record.id, file);
  }

  // 3. References between records.
  const ruleIds = new Set(records.filter((r) => r.record.type === "rule").map((r) => r.record.id));
  const assetIds = new Set(records.filter((r) => r.record.type !== "rule").map((r) => r.record.id));
  const colorIds = new Set(records.filter((r) => r.record.type === "color").map((r) => r.record.id));
  for (const { record, file } of records) {
    const at = rel(join(brandDir, file));
    const missing = (field: string, kind: string, ref: string) =>
      problems.push({ file: at, id: record.id, problem: `${field}: ${kind} "${ref}" does not exist` });
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

  // 4. Every file path exists on disk.
  for (const { record, file } of records) {
    for (const { field, path } of filePaths(record)) {
      const abs = join(brandDir, path);
      if (!existsSync(abs) || !statSync(abs).isFile()) {
        problems.push({ file: rel(join(brandDir, file)), id: record.id, problem: `${field}: file not found: ${rel(abs)}` });
      }
    }
  }

  // 5. Contrast: theme tokens and declared color pairings.
  if (brand) {
    for (const f of checkTokenContrast(brand.tokens)) problems.push({ file: rel(join(brandDir, "brand.json")), problem: `contrast ${formatContrastFailure(f)}` });
  }
  const colors = records.map((r) => r.record).filter((r): r is ColorAsset => r.type === "color");
  for (const f of checkPairingContrast(colors)) {
    const file = records.find((r) => r.record.type === "color")?.file ?? "assets.json";
    problems.push({ file: rel(join(brandDir, file)), problem: `contrast ${formatContrastFailure(f)}` });
  }

  if (problems.length || !brand) throw new BrandDataError(brandDir, problems);

  const all = records.map((r) => r.record).sort(byOrder);
  return {
    dir: brandDir,
    brand,
    assets: all.filter((r): r is Asset => r.type !== "rule" && r.status === "locked"),
    rules: all.filter((r): r is RuleAsset => r.type === "rule" && r.status === "locked"),
    pending: all.filter((r) => r.status === "pending"),
    all,
    changelog,
  };
}
