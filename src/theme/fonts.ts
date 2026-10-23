// @font-face rules for the brand's font assets, so pages render in the real brand fonts.
import type { FontAsset } from "../../schemas/asset.ts";

const FORMAT: Record<string, string> = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

function src(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return `url("${url}")${FORMAT[ext] ? ` format("${FORMAT[ext]}")` : ""}`;
}

/**
 * A variable file covers the font's weight range. Without one, static files map to `weights`
 * by position (first file, first weight). Extra files without a weight are skipped.
 */
export function fontFaceCss(fonts: FontAsset[], urlFor: (path: string) => string): string {
  const rules: string[] = [];
  for (const f of fonts) {
    const family = f.family.replace(/"/g, "");
    const variable = f.files.variable[0];
    if (variable) {
      const range = `${Math.min(...f.weights)} ${Math.max(...f.weights)}`;
      rules.push(`@font-face{font-family:"${family}";src:${src(urlFor(variable))};font-weight:${range};font-style:normal;font-display:swap}`);
      continue;
    }
    f.files.static.forEach((path, i) => {
      const weight = f.weights[i];
      if (weight) rules.push(`@font-face{font-family:"${family}";src:${src(urlFor(path))};font-weight:${weight};font-style:normal;font-display:swap}`);
    });
  }
  return rules.join("\n");
}
