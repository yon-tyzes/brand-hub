// Editor sections: one per editable record type, with the data file new records go to and the files it accepts.
import type { AnyRecord, AssetType } from "../../../schemas/asset.ts";

export interface EditorModule {
  id: string;
  label: string;
  /** Singular noun for buttons and messages: "Add logo". */
  noun: string;
  type: AssetType;
  /** Data file that new records of this type are written to. */
  dataFile: string;
  /** Files accepted by Add and by dropping on this section. Empty when items have no file. */
  accept: string[];
  /** Folder for uploaded files, under files/. */
  folder: string;
}

export const EDITOR_MODULES: EditorModule[] = [
  { id: "logos", label: "Logos", noun: "logo", type: "logo", dataFile: "logos.json", accept: [".svg", ".png", ".jpg", ".jpeg", ".webp", ".pdf", ".eps"], folder: "logos" },
  { id: "colors", label: "Colors", noun: "color", type: "color", dataFile: "colors.json", accept: [".svg"], folder: "colors" },
  { id: "fonts", label: "Fonts", noun: "font", type: "font", dataFile: "fonts.json", accept: [".woff2", ".woff", ".ttf", ".otf"], folder: "fonts" },
  { id: "icons", label: "Icons", noun: "icon", type: "icon", dataFile: "icons.json", accept: [".svg"], folder: "icons" },
  { id: "photos", label: "Photos", noun: "photo library", type: "photo-source", dataFile: "photos.json", accept: [], folder: "photos" },
  { id: "templates", label: "Templates", noun: "template", type: "template", dataFile: "templates.json", accept: [".png", ".jpg", ".jpeg", ".webp", ".svg"], folder: "templates" },
  { id: "rules", label: "Rules", noun: "rule", type: "rule", dataFile: "rules.json", accept: [], folder: "rules" },
];

/** Editor addresses below /admin: each module, then Brand settings. */
export const SETTINGS = "settings";
export const EDITOR_SECTIONS = [...EDITOR_MODULES.map((m) => m.id), SETTINGS];

export type EditorView = "overview" | typeof SETTINGS | string;

/** The view an address shows: /admin is the Overview, /admin/<id>/ a module or Brand settings. */
export function viewFromPath(pathname: string): EditorView {
  const id = pathname.replace(/^\/admin\/?/, "").replace(/\/$/, "");
  return EDITOR_SECTIONS.includes(id) ? id : "overview";
}

export const pathForView = (view: EditorView) => (view === "overview" ? "/admin/" : `/admin/${view}/`);

export const moduleForType = (type: AnyRecord["type"]) => EDITOR_MODULES.find((m) => m.type === type)!;

export const STATUS_LABEL = { draft: "Draft", pending: "Pending", locked: "Live", retired: "Retired" } as const;

/** Statuses in the inspector's order, with their help text (ENGINE_SPEC.md, section 8, Statuses). */
export const STATUS_OPTIONS = [
  { value: "locked", help: "On the site after you publish." },
  { value: "pending", help: "Not on the site yet. Waiting for approval." },
  { value: "draft", help: "Only in the editor." },
  { value: "retired", help: "It leaves the site when you publish. You can restore it later." },
] as const;

export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** A unique id from a label: "Horizontal logo" becomes "horizontal-logo", then "horizontal-logo-2". */
export function uniqueId(label: string, taken: Set<string>, prefix = ""): string {
  const base = (prefix ? `${prefix}-` : "") + slugify(label);
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

const today = () => new Date().toISOString().slice(0, 10);

/** A new draft record of a module's type, with empty or default fields. Validation tells her what is missing. */
export function newRecord(mod: EditorModule, label: string, taken: Set<string>, prefill: Partial<AnyRecord> = {}): AnyRecord {
  const base = {
    id: uniqueId(label, taken, mod.type === "icon" ? "icon" : mod.type === "template" ? "template" : ""),
    label,
    status: "draft" as const,
    version: "1.0",
    updated: today(),
    audience: "public" as const,
  };
  const byType: Record<string, object> = {
    logo: { lockup: "", colorway: "", background: "light", files: [] },
    color: { hex: "#000000", rgb: [0, 0, 0], role: "", pairings: [] },
    font: { family: label, role: "", weights: [400], files: { static: [], variable: [] }, license: "", install: "" },
    icon: { svgPath: "", group: "", pinned: false, source: "" },
    template: { category: "", formats: {}, thumbnail: "", rules: [] },
    "photo-source": { provider: "drive", url: "", access: "sign-in", guidelines: [] },
    rule: { title: label, chapter: "", body: "", do: [], dont: [], appliesTo: [] },
  };
  return { ...base, type: mod.type, ...byType[mod.type], ...prefill } as AnyRecord;
}
