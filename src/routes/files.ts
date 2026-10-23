// Serves everything under brands/<slug>/files/ at /files/..., in dev and as static files in the build.
import type { APIRoute, GetStaticPaths } from "astro";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { brandDir } from "virtual:brand-hub";

export const prerender = true;

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".pdf": "application/pdf", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".otf": "font/otf", ".txt": "text/plain; charset=utf-8", ".zip": "application/zip", ".eps": "application/postscript",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

export const getStaticPaths = (() => {
  const root = join(brandDir, "files");
  return walk(root).map((file) => ({ params: { path: relative(root, file).split(sep).join("/") } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const file = join(brandDir, "files", ...String(params.path).split("/"));
  return new Response(readFileSync(file), {
    headers: { "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" },
  });
};
