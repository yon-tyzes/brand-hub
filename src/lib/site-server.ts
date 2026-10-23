// The public site's data at build time: the brand folder loaded by the integration.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brand, brandDir, config, content, engineVersion } from "virtual:brand-hub";
import { createSite } from "../site/data.ts";
import { fileUrl } from "./paths.ts";

const svgCache = new Map<string, string>();

export function readBrandFile(path: string): string {
  return readFileSync(join(brandDir, path), "utf8");
}

export const site = createSite({
  brand,
  config,
  engineVersion,
  assets: content.assets,
  rules: content.rules,
  changelog: content.changelog,
  urlFor: fileUrl,
  svgFor: (path) => {
    if (!path.endsWith(".svg")) return undefined;
    let svg = svgCache.get(path);
    if (svg === undefined) svgCache.set(path, (svg = readBrandFile(path)));
    return svg;
  },
});
