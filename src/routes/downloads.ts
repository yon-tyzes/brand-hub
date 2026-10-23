// Zip downloads built at build time: all logos, and per font family (static and variable separately).
import type { APIRoute, GetStaticPaths } from "astro";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { zipSync, type Zippable } from "fflate";
import { brandDir } from "virtual:brand-hub";
import { assetsOfType, fileName, fontZips, isEnabled, LOGOS_ZIP } from "../lib/assets.ts";

export const prerender = true;

/** License files next to font files travel with them (OFL requires it). */
const LICENSE = /^(ofl|license|licence)(\.[a-z]+)?$/i;

function zipOf(paths: string[], withLicenses: boolean): Uint8Array {
  const entries: Zippable = {};
  for (const p of paths) entries[fileName(p)] = readFileSync(join(brandDir, p));
  if (withLicenses) {
    for (const dir of new Set(paths.map((p) => dirname(join(brandDir, p))))) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) if (LICENSE.test(name)) entries[name] = readFileSync(join(dir, name));
    }
  }
  // Fixed timestamp so identical inputs build identical zips.
  return zipSync(entries, { level: 6, mtime: new Date("2000-01-01T00:00:00Z") });
}

function downloads(): Record<string, () => Uint8Array> {
  const out: Record<string, () => Uint8Array> = {};
  if (isEnabled("logos")) {
    const files = assetsOfType("logo").flatMap((l) => l.files.map((f) => f.path));
    if (files.length) out[LOGOS_ZIP.split("/").pop()!] = () => zipOf(files, false);
  }
  if (isEnabled("fonts")) {
    for (const f of assetsOfType("font")) for (const z of fontZips(f)) out[z.href.split("/").pop()!] = () => zipOf(z.files, true);
  }
  return out;
}

export const getStaticPaths = (() => Object.keys(downloads()).map((name) => ({ params: { name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const build = downloads()[String(params.name)];
  if (!build) return new Response("Not found", { status: 404 });
  return new Response(build() as BodyInit, { headers: { "Content-Type": "application/zip" } });
};
