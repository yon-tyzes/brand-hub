// Snapshot of every brand record for the editor's `local` content adapter. Only built when admin is on.
// Instances that publish /admin publicly use a server-backed adapter instead (docs/ENGINE_SPEC.md, section 8).
import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { basename } from "node:path";
import { brandDir } from "virtual:brand-hub";
import type { BrandContent } from "../adapters/types.ts";
import { loadBrand } from "../content/load.ts";
import { readBrandFile } from "../lib/assets.ts";

export const prerender = true;

export const GET: APIRoute = () => {
  const c = loadBrand(brandDir);
  const svgs: Record<string, string> = {};
  for (const r of c.all) if (r.type === "icon") svgs[r.svgPath] = readBrandFile(r.svgPath);
  const data: BrandContent = { slug: basename(brandDir), brand: c.brand, records: c.all, sources: c.sources, svgs };
  const body = JSON.stringify(data);
  const revision = createHash("sha256").update(body).digest("hex").slice(0, 12);
  return new Response(JSON.stringify({ revision, data }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
