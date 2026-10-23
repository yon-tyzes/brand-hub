// Reads 0.1 brand data in 0.2 (spec section 13). Runs before schema validation: removes the shell keys the
// engine now owns, renames topTasks, and drops fallbackUrl, with one warning each. Pure, no Node imports.

export interface Warning {
  /** Where it is, for people reading build output. */
  file: string;
  /** Record the warning belongs to, when there is one. */
  id?: string;
  /** The field, as a path ("tokens.font", "url"). */
  field: string;
  /** What was found and what the engine does with it. */
  problem: string;
  /** What to change in the data. */
  fix: string;
}

export const formatWarning = (w: Warning) => `${w.file}${w.id ? `  id "${w.id}"` : ""}: ${w.field}: ${w.problem}. ${w.fix}`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const LEGACY_TOKEN_KEYS = ["font", "radius", "space", "dark"] as const;

/** brand.json: returns a copy without the 0.1 keys, plus a warning for each one found. */
export function migrateBrand(raw: unknown, file: string): { data: unknown; warnings: Warning[] } {
  if (!isObject(raw)) return { data: raw, warnings: [] };
  const warnings: Warning[] = [];
  const data: Record<string, unknown> = { ...raw };

  if (isObject(data.tokens)) {
    const tokens: Record<string, unknown> = { ...data.tokens };
    if (isObject(tokens.color)) {
      const { primary, ...rest } = tokens.color;
      const extra = Object.keys(rest);
      if (extra.length) {
        warnings.push({
          file,
          field: extra.map((k) => `tokens.color.${k}`).join(", "),
          problem: "ignored, the engine owns the shell colors",
          fix: "Remove these keys and keep only tokens.color.primary.",
        });
        tokens.color = primary === undefined ? {} : { primary };
      }
    }
    for (const key of LEGACY_TOKEN_KEYS) {
      if (!(key in tokens)) continue;
      delete tokens[key];
      warnings.push({ file, field: `tokens.${key}`, problem: "ignored, the engine owns the shell", fix: `Remove tokens.${key}.` });
    }
    data.tokens = tokens;
  }

  if ("topTasks" in data) {
    const { topTasks } = data;
    delete data.topTasks;
    if ("quickDownloads" in data) {
      warnings.push({ file, field: "topTasks", problem: "ignored, quickDownloads is set", fix: "Remove topTasks." });
    } else {
      data.quickDownloads = topTasks;
      warnings.push({ file, field: "topTasks", problem: "read as quickDownloads", fix: "Rename topTasks to quickDownloads." });
    }
  }

  return { data, warnings };
}

/** One asset record: drops a template's fallbackUrl and flags a 0.1 url. Other records pass through. */
export function migrateRecord(raw: unknown, file: string): { data: unknown; warnings: Warning[] } {
  if (!isObject(raw) || raw.type !== "template") return { data: raw, warnings: [] };
  const warnings: Warning[] = [];
  const data: Record<string, unknown> = { ...raw };
  const id = typeof data.id === "string" ? data.id : undefined;
  if ("fallbackUrl" in data) {
    delete data.fallbackUrl;
    warnings.push({ file, id, field: "fallbackUrl", problem: "ignored", fix: "Add the file as formats.docx, formats.pptx, or formats.pdf, then remove fallbackUrl." });
  }
  if ("url" in data) {
    warnings.push({
      file,
      id,
      field: "url",
      problem: 'read as a single "Open template" link',
      fix: "Move it to formats.canva for a Canva link, or add the files as formats.docx, formats.pptx, or formats.pdf, then remove url.",
    });
  }
  return { data, warnings };
}
