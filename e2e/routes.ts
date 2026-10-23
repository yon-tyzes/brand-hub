// Every HTML route in the build, found by walking dist/. Redirect pages for moved 0.1 routes are listed
// separately: they leave as soon as they load.
import { readdirSync, readFileSync, statSync } from "node:fs";
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

const isRedirect = (file: string) => readFileSync(file, "utf8").includes('http-equiv="refresh"');
const toRoute = (f: string) => {
  const r = "/" + relative(dist, f).split(sep).slice(0, -1).join("/");
  return r === "/" ? r : `${r}/`;
};
const pages = walk(dist);

export const routes = pages.filter((f) => !isRedirect(f)).map(toRoute).sort();
export const redirectRoutes = pages.filter(isRedirect).map(toRoute).sort();

export const THEMES = ["light", "dark"] as const;

export async function setTheme(page: import("@playwright/test").Page, theme: (typeof THEMES)[number]) {
  await page.addInitScript((t) => localStorage.setItem("bh-theme", t), theme);
}
