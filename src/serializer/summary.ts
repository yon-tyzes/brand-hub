// Plain-language lines describing what changed between two sets of records. Used for the editor's change
// list, the change set summary, and changelog entries.
import type { AnyRecord, AssetType } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";
import { filePaths } from "../content/file-paths.ts";
import { TYPE_LABEL } from "../lib/labels.ts";
import { stableJson } from "./stable-json.ts";

export interface RecordChange {
  /** Record id, or "order:<type>" for a reorder. */
  id: string;
  kind: "added" | "deleted" | "changed";
  line: string;
  /** For records: what changed, used to pick changelog entries. */
  parts?: { status?: AnyRecord["status"]; files?: boolean; details?: boolean; renamed?: boolean };
}

const SECTION_LABEL: Partial<Record<AssetType, string>> = {
  logo: "Logos", color: "Colors", font: "Fonts", icon: "Icons", template: "Templates", "photo-source": "Photos", rule: "Rules",
};

const STATUS_LINE = { locked: "now live", retired: "retired", draft: "set to Draft", pending: "set to Pending" } as const;

const pathsOf = (r: AnyRecord) => filePaths(r).map((f) => f.path).sort().join("|");
/** Fields that describe content, not bookkeeping. Key order does not matter. */
const content = (r: AnyRecord) => {
  const { order: _o, updated: _u, version: _v, label: _l, status: _s, ...rest } = r as AnyRecord & Record<string, unknown>;
  for (const k of ["files", "svgPath", "thumbnail"]) delete (rest as Record<string, unknown>)[k];
  return stableJson(rest);
};

/** Brand settings people edit in the editor, with the words for the change line. */
const BRAND_PARTS: [string, (b: Brand) => unknown][] = [
  ["name", (b) => [b.name, b.shortName]],
  ["primary color", (b) => b.tokens.color.primary],
  ["hero colors", (b) => b.hero.tint ?? null],
  ["guide chapters", (b) => b.guide.chapters],
  ["Quick downloads", (b) => b.quickDownloads],
];

/** One line when brand settings changed: "Brand settings: primary color, guide chapters changed". */
export function describeBrandChange(before: Brand, after: Brand): RecordChange | undefined {
  if (stableJson(before) === stableJson(after)) return undefined;
  const parts = BRAND_PARTS.filter(([, pick]) => stableJson(pick(before)) !== stableJson(pick(after))).map(([name]) => name);
  return { id: BRAND_CHANGE, kind: "changed", line: `Brand settings: ${parts.length ? parts.join(", ") : "settings"} changed` };
}

/** Change id for brand settings. Never a record id: ids are kebab-case. */
export const BRAND_CHANGE = "brand:settings";

export function sortedIds(records: AnyRecord[], type: AnyRecord["type"]): string[] {
  return records
    .filter((r) => r.type === type)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label))
    .map((r) => r.id);
}

export function describeChanges(before: AnyRecord[], after: AnyRecord[]): RecordChange[] {
  const b = new Map(before.map((r) => [r.id, r]));
  const a = new Map(after.map((r) => [r.id, r]));
  const out: RecordChange[] = [];
  const name = (r: AnyRecord) => `${TYPE_LABEL[r.type]}, ${r.label}`;
  for (const r of after) {
    const old = b.get(r.id);
    if (!old) {
      out.push({ id: r.id, kind: "added", line: `${name(r)}: added`, parts: { status: r.status } });
      continue;
    }
    const lines: string[] = [];
    const parts: NonNullable<RecordChange["parts"]> = {};
    if (old.label !== r.label) (lines.push(`renamed from "${old.label}"`), (parts.renamed = true));
    if (old.status !== r.status) (lines.push(STATUS_LINE[r.status]), (parts.status = r.status));
    if (pathsOf(old) !== pathsOf(r)) (lines.push(r.type === "logo" || r.type === "font" ? "files changed" : "file replaced"), (parts.files = true));
    if (content(old) !== content(r)) (lines.push("details updated"), (parts.details = true));
    if (lines.length) out.push({ id: r.id, kind: "changed", line: `${name(r)}: ${lines.join(", ")}`, parts });
  }
  for (const r of before) if (!a.has(r.id)) out.push({ id: r.id, kind: "deleted", line: `${name(r)}: deleted` });

  for (const t of [...new Set(after.map((r) => r.type))]) {
    const kept = (rs: AnyRecord[]) => sortedIds(rs, t).filter((id) => b.has(id) && a.has(id)).join(",");
    if (kept(before) !== kept(after)) out.push({ id: `order:${t}`, kind: "changed", line: `${SECTION_LABEL[t] ?? TYPE_LABEL[t]}: order changed` });
  }
  return out;
}
