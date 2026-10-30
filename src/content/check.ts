// Validates a brand's data: schemas, unique ids, references between records, file paths, and pairing contrast.
// Pure: reads through a BrandSource, so the build (files on disk) and the serializer (files in memory)
// apply the same rules. No Node imports.
import type { z } from "zod";
import {
  asset as assetSchema, brand as brandSchema, changelogEntry, onboarding as onboardingSchema, ruleAsset, signature as signatureSchema,
  type AnyRecord, type Asset, type AssetType, type Brand, type ChangelogEntry, type ColorAsset, type Onboarding, type RuleAsset, type Signature,
} from "../../schemas/index.ts";
import { checkPairingContrast, formatContrastFailure } from "../theme/contrast.ts";
import { filePaths } from "./file-paths.ts";
import { migrateBrand, migrateRecord, type Warning } from "./legacy.ts";

/** Optional per-module split files and the asset types each may hold. assets.json may hold any type. */
export const SPLIT_FILES: Record<string, AssetType[]> = {
  "logos.json": ["logo"],
  "colors.json": ["color", "gradient"],
  "fonts.json": ["font"],
  "icons.json": ["icon"],
  "templates.json": ["template"],
  "photos.json": ["photo-source"],
  "boilerplate.json": ["boilerplate"],
  "documents.json": ["document"],
};

/** Optional files that hold one object, not records (spec section 14). */
export const OBJECT_FILES = ["signature.json", "onboarding.json"];

export const DATA_FILES = ["assets.json", ...Object.keys(SPLIT_FILES), "rules.json", ...OBJECT_FILES];

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
  /** Pending assets and rules. Shown in the editor only, never on public pages. */
  pending: AnyRecord[];
  /** Every record in every status, for the editor. */
  all: AnyRecord[];
  /** Data file each record was read from, by id. */
  sources: Record<string, string>;
  changelog: ChangelogEntry[];
  /** signature.json, when the brand has one. */
  signature?: Signature;
  /** onboarding.json, when the brand has one. */
  onboarding?: Onboarding;
  /** 0.1 data read with a fallback (src/content/legacy.ts). The build prints them and goes on. */
  warnings: Warning[];
}

export const byOrder = (a: AnyRecord, b: AnyRecord) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label);

export function checkBrand(src: BrandSource): { problems: Problem[]; warnings: Warning[]; content?: CheckedContent } {
  const problems: Problem[] = [];
  const warnings: Warning[] = [];
  /** Applies a 0.1 migration and keeps its warnings. */
  const migrate = (m: { data: unknown; warnings: Warning[] }) => {
    warnings.push(...m.warnings);
    return m.data;
  };
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
  function validateItems<S extends z.ZodType>(name: string, schema: S, data: unknown, migrateItem?: (item: unknown) => unknown): z.output<S>[] {
    if (data === undefined) return [];
    if (!Array.isArray(data)) {
      problems.push({ file: src.label(name), problem: "must be a JSON array", code: "not-array" });
      unreadable = true;
      return [];
    }
    const out: z.output<S>[] = [];
    data.forEach((original: unknown, index) => {
      const item = migrateItem ? migrateItem(original) : original;
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
  const brand = brandRaw === undefined ? undefined : validate("brand.json", brandSchema, migrate(migrateBrand(brandRaw, src.label("brand.json"))));

  const records: { record: AnyRecord; file: string }[] = [];
  for (const name of ["assets.json", ...Object.keys(SPLIT_FILES)]) {
    for (const a of validateItems(name, assetSchema, readJson(name, false), (item) => migrate(migrateRecord(item, src.label(name))))) {
      const expected = SPLIT_FILES[name];
      if (expected && !expected.includes(a.type)) {
        problems.push({ file: src.label(name), id: a.id, problem: `type "${a.type}" does not belong in ${name} (expects ${expected.map((t) => `"${t}"`).join(" or ")})`, code: "wrong-file" });
      }
      records.push({ record: a, file: name });
    }
  }
  for (const r of validateItems("rules.json", ruleAsset, readJson("rules.json", false))) {
    records.push({ record: r, file: "rules.json" });
  }
  const changelog = validateItems("changelog.json", changelogEntry, readJson("changelog.json", false));

  const signatureRaw = readJson("signature.json", false);
  let signature: Signature | undefined;
  if (Array.isArray(signatureRaw)) {
    problems.push({
      file: src.label("signature.json"), code: "schema",
      problem: "holds 0.2 signature-layout records. From 0.3 it is one object with fields and designs (ENGINE_SPEC.md, section 14)",
    });
  } else if (signatureRaw !== undefined) {
    signature = validate("signature.json", signatureSchema, signatureRaw);
  }
  const onboardingRaw = readJson("onboarding.json", false);
  const onboarding = onboardingRaw === undefined ? undefined : validate("onboarding.json", onboardingSchema, onboardingRaw);

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
  const statusOf = new Map(records.map((r) => [r.record.id, r.record.status]));
  const chapterIds = new Set(brand?.guide.chapters.map((c) => c.id) ?? []);
  const fontGroups = brand?.modules.fonts?.groups;
  const groupIds = new Set(fontGroups?.map((g) => g.id) ?? []);
  for (const { record, file } of unreadable ? [] : records) {
    const missing = (field: string, kind: string, ref: string) =>
      problems.push({ file: src.label(file), id: record.id, problem: `${field}: ${kind} "${ref}" does not exist`, code: "reference", field: field.split(".")[0], ref });
    for (const ref of record.governedBy ?? []) if (!ruleIds.has(ref)) missing("governedBy", "rule", ref);
    if (record.type === "rule") {
      for (const ref of record.appliesTo) if (!assetIds.has(ref)) missing("appliesTo", "asset", ref);
      if (brand && !chapterIds.has(record.chapter)) {
        problems.push({
          file: src.label(file), id: record.id, code: "reference", field: "chapter", ref: record.chapter,
          problem: `chapter: "${record.chapter}" is not in guide.chapters in ${src.label("brand.json")}. Add it there or use one of: ${[...chapterIds].join(", ") || "(none listed)"}`,
        });
      }
    }
    if (record.type === "template" && !Object.values(record.formats).some(Boolean) && !record.url) {
      problems.push({ file: src.label(file), id: record.id, code: "schema", field: "formats", problem: "formats: needs at least one of canva, docx, pptx, or pdf" });
    }
    if (record.type === "template") for (const ref of record.rules) if (!ruleIds.has(ref)) missing("rules", "rule", ref);
    if (record.type === "font" && brand && record.status !== "retired") {
      const listed = `Use one of: ${[...groupIds].join(", ") || "(none listed)"}`;
      if (record.group && !groupIds.has(record.group)) {
        problems.push({ file: src.label(file), id: record.id, code: "reference", field: "group", ref: record.group, problem: `group: font "${record.id}" names group "${record.group}", which is not in modules.fonts.groups in ${src.label("brand.json")}. ${listed}` });
      } else if (!record.group && fontGroups) {
        problems.push({ file: src.label(file), id: record.id, code: "reference", field: "group", problem: `group: font "${record.id}" has no group. modules.fonts.groups is set in ${src.label("brand.json")}, so every font needs one. ${listed}` });
      }
    }
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
    for (const ref of brand.quickDownloads) {
      if (!assetIds.has(ref)) problems.push({ file: at, problem: `quickDownloads: asset "${ref}" does not exist`, code: "reference", field: "quickDownloads", ref });
      else if (statusOf.has(ref) && statusOf.get(ref) !== "locked") {
        problems.push({ file: at, problem: `quickDownloads: asset "${ref}" is ${statusOf.get(ref)}, only locked assets show on the site. Lock it or remove it from quickDownloads`, code: "reference", field: "quickDownloads", ref });
      }
    }
    for (const key of ["colors", "grounds"] as const) {
      for (const ref of brand.modules.icons?.[key] ?? []) if (!colorIds.has(ref)) problems.push({ file: at, problem: `modules.icons.${key}: color "${ref}" does not exist`, code: "reference", field: "modules", ref });
    }

    // Office theme slots: each names a locked color or font (spec section 7).
    const office = brand.modules.office;
    if (office) {
      const fontIds = idsOf((t) => t === "font");
      const slots = [
        ...Object.entries(office.colors).map(([slot, ref]) => ({ slot: `colors.${slot}`, ref, kind: "color", ids: colorIds })),
        ...Object.entries(office.fonts).map(([slot, ref]) => ({ slot: `fonts.${slot}`, ref, kind: "font", ids: fontIds })),
      ];
      for (const { slot, ref, kind, ids } of slots) {
        const field = `modules.office.${slot}`;
        if (!ids.has(ref)) problems.push({ file: at, problem: `${field}: ${kind} "${ref}" does not exist`, code: "reference", field: "modules", ref });
        else if (statusOf.has(ref) && statusOf.get(ref) !== "locked") {
          problems.push({ file: at, problem: `${field}: ${kind} "${ref}" is ${statusOf.get(ref)}. Only locked ${kind}s may fill an Office theme slot`, code: "reference", field: "modules", ref });
        }
      }
    }
  }

  // signature.json: fields each design uses, and the colors each variant names.
  if (signature && !unreadable) {
    const at = src.label("signature.json");
    const fieldIds = new Set(signature.fields.map((f) => f.id));
    signature.designs.forEach((d, di) => {
      for (const ref of d.fields) {
        if (!fieldIds.has(ref)) problems.push({ file: at, id: d.id, problem: `designs.${di}.fields: field "${ref}" is not in fields. Use one of: ${[...fieldIds].join(", ")}`, code: "reference", field: "fields", ref });
      }
      d.variants.forEach((v, vi) => {
        for (const [name, ref] of Object.entries(v.colors)) {
          const where = `designs.${di}.variants.${vi}.colors.${name}`;
          if (!colorIds.has(ref)) problems.push({ file: at, id: d.id, problem: `${where}: color "${ref}" does not exist`, code: "reference", field: "variants", ref });
          else if (statusOf.has(ref) && statusOf.get(ref) !== "locked") {
            problems.push({ file: at, id: d.id, problem: `${where}: color "${ref}" is ${statusOf.get(ref)}. Only locked colors may fill a signature variant`, code: "reference", field: "variants", ref });
          }
        }
      });
    });
  }

  // onboarding.json: each link names an asset that exists. A link to an asset that is not locked is left out.
  if (onboarding && !unreadable) {
    const at = src.label("onboarding.json");
    onboarding.steps.forEach((step, si) => {
      step.links.forEach((link, li) => {
        if (!("asset" in link)) return;
        const where = `steps.${si}.links.${li}.asset`;
        if (!assetIds.has(link.asset)) problems.push({ file: at, id: step.id, problem: `${where}: asset "${link.asset}" does not exist`, code: "reference", field: "links", ref: link.asset });
        else if (statusOf.has(link.asset) && statusOf.get(link.asset) !== "locked") {
          warnings.push({ file: at, id: step.id, field: where, problem: `asset "${link.asset}" is ${statusOf.get(link.asset)}, so the link is left out`, fix: "Lock the asset or link to another one." });
        }
      });
    });
  }

  // 4. Every file path exists, brand.json's included.
  const guidePdf = brand?.guide.pdf?.path;
  if (guidePdf && !src.exists(guidePdf)) {
    problems.push({ file: src.label("brand.json"), problem: `guide.pdf.path: file not found: ${src.label(guidePdf)}`, code: "file-not-found", field: "guide", ref: guidePdf });
  }
  signature?.designs.forEach((d, i) => {
    if (!src.exists(d.template)) {
      problems.push({ file: src.label("signature.json"), id: d.id, problem: `designs.${i}.template: file not found: ${src.label(d.template)}`, code: "file-not-found", field: "template", ref: d.template });
    }
  });
  for (const { record, file } of records) {
    for (const { field, path } of filePaths(record)) {
      if (!src.exists(path)) {
        problems.push({ file: src.label(file), id: record.id, problem: `${field}: file not found: ${src.label(path)}`, code: "file-not-found", field: field.split(".")[0], ref: path });
      }
    }
  }

  // Fonts Word cannot install: WOFF2 files and no static TTF or OTF. A warning: the site still renders them.
  for (const { record, file } of records) {
    if (record.type !== "font" || record.status === "retired") continue;
    const { static: statics, variable, web = [] } = record.files;
    const woff2 = web.length > 0 || [...statics, ...variable].some((p) => p.toLowerCase().endsWith(".woff2"));
    if (woff2 && !statics.some((p) => /\.(ttf|otf)$/i.test(p))) {
      warnings.push({
        file: src.label(file), id: record.id, field: "files",
        problem: `font "${record.id}" has only WOFF2 files, so it cannot be installed in Word`,
        fix: "Add its static TTF or OTF files to files.static, and keep the WOFF2 files in files.web.",
      });
    }
  }

  // 5. Contrast: declared color pairings. The shell's own tokens are checked by the unit tests.
  const colors = records.map((r) => r.record).filter((r): r is ColorAsset => r.type === "color");
  for (const f of checkPairingContrast(colors)) {
    problems.push({ file: src.label(records.find((r) => r.record.id === f.owner)?.file ?? "assets.json"), id: f.owner, problem: `contrast ${formatContrastFailure(f)}`, code: "contrast", field: "pairings" });
  }

  if (problems.length || !brand) return { problems, warnings };

  const all = records.map((r) => r.record).sort(byOrder);
  return {
    problems,
    warnings,
    content: {
      brand,
      assets: all.filter((r): r is Asset => r.type !== "rule" && r.status === "locked"),
      rules: all.filter((r): r is RuleAsset => r.type === "rule" && r.status === "locked"),
      pending: all.filter((r) => r.status === "pending"),
      all,
      sources: Object.fromEntries(records.map((r) => [r.record.id, r.file])),
      changelog,
      ...(signature ? { signature } : {}),
      ...(onboarding ? { onboarding } : {}),
      warnings,
    },
  };
}
