// Real builds of the demo brand with a config the repo does not use, into a temporary folder: what ships for
// motion: "calm" (ENGINE_SPEC.md, section 6, Calm motion) and admin.enabled "dev" (section 4).
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import react from "@astrojs/react";
import { build } from "astro";
import { afterAll, describe, expect, it } from "vitest";
import type { HubConfigInput } from "../schemas/hub-config.ts";
import { brandHub } from "../src/integration/index.ts";

const ROOT = join(import.meta.dirname, "..");
const outs: string[] = [];
afterAll(() => outs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Builds the demo with this config and returns the output folder. */
async function buildWith(hub: Partial<HubConfigInput>): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "brand-hub-build-"));
  outs.push(outDir);
  await build({
    root: ROOT,
    configFile: false,
    outDir,
    logLevel: "error",
    output: "static",
    integrations: [react(), brandHub({ brand: "demo", modules: ["fonts"], ...hub })],
  });
  return outDir;
}

const scripts = (dir: string) => readdirSync(join(dir, "_astro")).filter((f) => f.endsWith(".js"));
/** Every script the home page can load: its own, and every chunk those import, followed through the graph. */
function homeScripts(dir: string): string[] {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const seen = new Set<string>();
  const queue = [...html.matchAll(/\/_astro\/([\w.-]+\.js)/g)].map((m) => m[1]!);
  while (queue.length) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const js = readFileSync(join(dir, "_astro", name), "utf8");
    for (const m of js.matchAll(/["'(/]\.?\/?([\w.-]+\.js)["')]/g)) if (scripts(dir).includes(m[1]!)) queue.push(m[1]!);
  }
  return [...seen];
}

describe("motion: calm", () => {
  it("does not load the hero script or the pointer light on the home page", { timeout: 120_000 }, async () => {
    const calm = await buildWith({ motion: "calm" });
    const full = await buildWith({});
    const hero = (names: string[]) => names.filter((n) => /^hero(-gl|-light|-contour)?\./.test(n));

    expect(hero(homeScripts(full))).toEqual(expect.arrayContaining([expect.stringMatching(/^hero\./), expect.stringMatching(/^hero-gl\./), expect.stringMatching(/^hero-light\./)]));
    expect(hero(homeScripts(calm))).toEqual([]);
    expect(homeScripts(calm).some((n) => n.startsWith("hero-typing."))).toBe(true);

    const html = readFileSync(join(calm, "index.html"), "utf8");
    expect(html).toMatch(/<html[^>]* data-motion="calm"/);
    expect(html).not.toContain("@view-transition");
    const fullHtml = readFileSync(join(full, "index.html"), "utf8");
    expect(fullHtml).not.toContain("data-motion");
    expect(fullHtml).toContain("@view-transition{navigation:auto}");
  });
});

describe("admin.enabled: \"dev\"", () => {
  it("ships no admin route, no editor JavaScript, and no editor search entries in a production build", { timeout: 120_000 }, async () => {
    const dev = await buildWith({ admin: { enabled: "dev", adapter: "local", auth: "local" } });
    const on = await buildWith({ admin: { enabled: true, adapter: "demo", auth: "demo" } });
    const editorJs = (dir: string) => scripts(dir).filter((n) => /^(AdminApp|PreviewApp)\./.test(n));

    expect(existsSync(join(on, "admin", "index.html"))).toBe(true);
    expect(editorJs(on)).not.toEqual([]);

    expect(existsSync(join(dev, "admin"))).toBe(false);
    expect(editorJs(dev)).toEqual([]);
    expect(readFileSync(join(dev, "search-index.json"), "utf8")).not.toMatch(/\/admin/);
  });
});
