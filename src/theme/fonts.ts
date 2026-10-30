// @font-face rules for the brand's font assets, so pages render in the real brand fonts.
import type { FontAsset } from "../../schemas/asset.ts";

const FORMAT: Record<string, string> = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

function src(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return `url("${url}")${FORMAT[ext] ? ` format("${FORMAT[ext]}")` : ""}`;
}

/** A web file named like a variable font ("inter-latin-wght-normal.woff2", "Inter-Variable.woff2"). */
const isVariableName = (path: string) => /wght|variable/i.test(path.split("/").pop() ?? "");

/**
 * The site uses a font's web files when it has them, else its download files. A variable file covers the
 * font's weight range. Without one, static files map to `weights` by position (first file, first weight).
 * Extra files without a weight are skipped.
 */
export function fontFaceCss(fonts: FontAsset[], urlFor: (path: string) => string): string {
  const rules: string[] = [];
  for (const f of fonts) {
    const family = f.family.replace(/"/g, "");
    const web = f.files.web?.length ? f.files.web : undefined;
    const variable = web ? web.find(isVariableName) : f.files.variable[0];
    const statics = web ? web.filter((p) => !isVariableName(p)) : f.files.static;
    if (variable) {
      const range = `${Math.min(...f.weights)} ${Math.max(...f.weights)}`;
      rules.push(`@font-face{font-family:"${family}";src:${src(urlFor(variable))};font-weight:${range};font-style:normal;font-display:swap}`);
      continue;
    }
    statics.forEach((path, i) => {
      const weight = f.weights[i];
      if (weight) rules.push(`@font-face{font-family:"${family}";src:${src(urlFor(path))};font-weight:${weight};font-style:normal;font-display:swap}`);
    });
  }
  return rules.join("\n");
}
