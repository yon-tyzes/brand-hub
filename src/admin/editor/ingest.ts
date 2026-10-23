// Turns dropped or picked files into stored uploads and prefilled draft records.
// Prefill: name from the file name, size for images, colors found in SVG files.
import type { AnyRecord, ColorAsset, FontAsset, LogoAsset } from "../../../schemas/asset.ts";
import { cleanName, extension, imageSize, isRaster, uploadPath } from "./files.ts";
import { newRecord, type EditorModule } from "./modules.ts";
import type { StoredFile } from "./state.ts";
import { sanitizeSvg } from "./svg.ts";

export interface Upload extends StoredFile {
  /** What sanitizing changed, in plain words. */
  notes: string[];
  colors: string[];
  error?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

/** Reads one file into an upload. SVG files are sanitized; raster images get their pixel size. */
export async function ingest(file: File, mod: EditorModule, taken: Set<string>): Promise<Upload> {
  const path = uploadPath(mod.folder, file.name, taken);
  taken.add(path);
  const ext = extension(file.name);
  if (ext === "svg") {
    const r = sanitizeSvg(await file.text(), { icon: mod.type === "icon" });
    return {
      path, name: file.name, type: "image/svg+xml", blob: new Blob([r.svg], { type: "image/svg+xml" }),
      width: r.width ? Math.round(r.width) : undefined, height: r.height ? Math.round(r.height) : undefined,
      notes: r.notes, colors: r.colors, error: r.error,
    };
  }
  const size = isRaster(file.name) ? await imageSize(file) : undefined;
  return { path, name: file.name, type: file.type || "application/octet-stream", blob: file, ...size, notes: [], colors: [] };
}

export const accepts = (mod: EditorModule, name: string) => mod.accept.includes(`.${extension(name)}`);

const has = (name: string, words: RegExp) => words.test(name.toLowerCase());

/** Draft records for files dropped on a section. Files the section does not take are skipped by the caller. */
export function recordsFromUploads(mod: EditorModule, uploads: Upload[], taken: Set<string>): AnyRecord[] {
  const make = (label: string, prefill: Partial<AnyRecord>) => {
    const r = newRecord(mod, label, taken, prefill);
    taken.add(r.id);
    return r;
  };
  switch (mod.type) {
    case "logo":
      return uploads.map((u) => {
        const reversed = has(u.name, /revers|white|negative|knockout/);
        const lockup = has(u.name, /stack/) ? "Stacked" : has(u.name, /mark|icon|symbol/) ? "Mark" : has(u.name, /horiz/) ? "Horizontal" : "";
        return make(cleanName(u.name), {
          lockup, colorway: reversed ? "Reversed" : "", background: reversed ? "dark" : "light",
          files: [{ ext: extension(u.name), path: u.path, ...(u.width && extension(u.name) !== "svg" ? { width: u.width } : {}) }],
        } as Partial<LogoAsset>);
      });
    case "icon":
      return uploads.map((u) => make(cleanName(u.name), { svgPath: u.path } as Partial<AnyRecord>));
    case "template":
      return uploads.map((u) => make(cleanName(u.name), { thumbnail: u.path } as Partial<AnyRecord>));
    case "color":
      return uploads.flatMap((u) =>
        u.colors.slice(0, 12).map((hex, i, all) =>
          make(all.length > 1 ? `${cleanName(u.name)} ${i + 1}` : cleanName(u.name), { hex, rgb: hexToRgb(hex) } as Partial<ColorAsset>),
        ),
      );
    case "font": {
      // All files dropped together become one family; files named "variable" or "wght" are variable fonts.
      if (!uploads.length) return [];
      const variable = uploads.filter((u) => has(u.name, /variable|wght|\bvf\b/));
      const statics = uploads.filter((u) => !variable.includes(u));
      const family = cleanName(uploads[0]!.name).replace(/\b(thin|light|regular|medium|semibold|bold|black|variable|wght|italic|\d{3}|latin|normal)\b/gi, "").replace(/\s+/g, " ").trim() || "New font";
      return [make(family, { family, files: { static: statics.map((u) => u.path), variable: variable.map((u) => u.path) } } as Partial<FontAsset>)];
    }
    default:
      return [];
  }
}
