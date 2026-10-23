// Fields that point to files in the brand folder. Shared by the loader and the editor (no Node imports).
import type { AnyRecord } from "../../schemas/asset.ts";

/** File paths an asset points to, relative to the brand folder. */
export function filePaths(a: AnyRecord): { field: string; path: string }[] {
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
      return [
        { field: "thumbnail", path: a.thumbnail },
        ...(["docx", "pptx", "pdf"] as const).flatMap((k) => (a.formats[k] ? [{ field: `formats.${k}`, path: a.formats[k] }] : [])),
      ];
    default:
      return [];
  }
}

