// Zip downloads built at build time: all logos, per font family (static and variable separately), and per font
// group ("Download all": one folder per family, each with its license).
import type { APIRoute, GetStaticPaths } from "astro";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { zipSync, type Zippable } from "fflate";
import { brandDir } from "virtual:brand-hub";
import { fileName } from "../lib/paths.ts";
import { site } from "../lib/site-server.ts";
import { fontZips, LOGOS_ZIP } from "../site/data.ts";

export const prerender = true;

/** License files next to font files travel with them (OFL requires it). */
const LICENSE = /^(ofl|license|licence)(\.[a-z]+)?$/i;

function entriesOf(paths: string[], withLicenses: boolean): Zippable {
  const entries: Zippable = {};
  for (const p of paths) entries[fileName(p)] = readFileSync(join(brandDir, p));
  if (withLicenses) {
    for (const dir of new Set(paths.map((p) => dirname(join(brandDir, p))))) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) if (LICENSE.test(name)) entries[name] = readFileSync(join(dir, name));
    }
  }
  return entries;
}

// Fixed timestamp so identical inputs build identical zips.
const zip = (entries: Zippable) => zipSync(entries, { level: 6, mtime: new Date("2000-01-01T00:00:00Z") });
const zipOf = (paths: string[], withLicenses: boolean) => zip(entriesOf(paths, withLicenses));

function downloads(): Record<string, () => Uint8Array> {
  const out: Record<string, () => Uint8Array> = {};
  if (site.isEnabled("logos")) {
    const files = site.assetsOfType("logo").flatMap((l) => l.files.map((f) => f.path));
    if (files.length) out[LOGOS_ZIP.split("/").pop()!] = () => zipOf(files, false);
  }
  if (site.isEnabled("fonts")) {
    for (const f of site.assetsOfType("font")) for (const z of fontZips(f)) out[z.href.split("/").pop()!] = () => zipOf(z.files, true);
    // Families keep their own folder, so two OFL.txt files do not overwrite each other.
    for (const g of site.fontGroups() ?? []) {
      out[g.href.split("/").pop()!] = () => zip(Object.fromEntries(g.fonts.map((f) => [f.family, entriesOf(fontZips(f).flatMap((z) => z.files), true)])));
    }
  }
  return out;
}

export const getStaticPaths = (() => Object.keys(downloads()).map((name) => ({ params: { name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const build = downloads()[String(params.name)];
  if (!build) return new Response("Not found", { status: 404 });
  return new Response(build() as BodyInit, { headers: { "Content-Type": "application/zip" } });
};
