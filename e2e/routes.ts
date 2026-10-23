// Every HTML route in the build, found by walking dist/.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const dist = join(import.meta.dirname, "..", "dist");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === "index.html") out.push(p);
  }
  return out;
}

export const routes = walk(dist)
  .map((f) => "/" + relative(dist, f).split(sep).slice(0, -1).join("/"))
  .map((r) => (r === "/" ? r : `${r}/`))
  .sort();

export const THEMES = ["light", "dark"] as const;

export async function setTheme(page: import("@playwright/test").Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => localStorage.setItem("bh-theme", t), theme);
}
