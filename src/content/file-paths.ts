// Fields that point to files in the brand folder. Shared by the loader and the editor (no Node imports).
import type { AnyRecord } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";

/** File paths brand.json points to, relative to the brand folder. Tolerates a brand not yet validated. */
export function brandFilePaths(b: Brand | undefined): { field: string; path: string }[] {
  const pdf = b?.guide?.pdf;
  return pdf ? [{ field: "guide.pdf.path", path: pdf.path }] : [];
}

/** File paths an asset points to, relative to the brand folder. */
export function filePaths(a: AnyRecord): { field: string; path: string }[] {
  switch (a.type) {
    case "logo":
      return a.files.map((f, i) => ({ field: `files.${i}.path`, path: f.path }));
    case "font":
      return [
        ...a.files.static.map((p, i) => ({ field: `files.static.${i}`, path: p })),
        ...a.files.variable.map((p, i) => ({ field: `files.variable.${i}`, path: p })),
        ...(a.files.web ?? []).map((p, i) => ({ field: `files.web.${i}`, path: p })),
      ];
    case "icon":
      return [{ field: "svgPath", path: a.svgPath }];
    case "template":
      return [
        { field: "thumbnail", path: a.thumbnail },
        ...(["docx", "pptx", "pdf"] as const).flatMap((k) => (a.formats[k] ? [{ field: `formats.${k}`, path: a.formats[k] }] : [])),
        ...(a.variants ?? []).flatMap((v, i) => [
          { field: `variants.${i}.thumbnail`, path: v.thumbnail },
          ...(["docx", "pptx", "pdf"] as const).flatMap((k) => (v.formats?.[k] ? [{ field: `variants.${i}.formats.${k}`, path: v.formats[k] }] : [])),
        ]),
      ];
    default:
      return [];
  }
}

