// Modules built from brand data (ENGINE_SPEC.md, sections 4 and 14): listed but without their data, office, start,
// signature, and boilerplate get no route, no redirect, and no warning. A 0.2.2 config builds as before.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { brandHub } from "../src/integration/index.ts";
import { demoCopy, edit, write } from "./helpers.ts";

/** Runs the config hook and the build:done hook. Returns injected routes, warnings, and dist/_redirects. */
async function build(root: string, inline: Parameters<typeof brandHub>[0]) {
  const injectRoute = vi.fn();
  const warn = vi.fn();
  const integration = brandHub(inline);
  await integration.hooks["astro:config:setup"]!({
    config: { root: pathToFileURL(root + "/") },
    command: "build",
    injectRoute,
    updateConfig: vi.fn(),
    addWatchFile: vi.fn(),
    logger: { warn },
  } as never);
  const dist = mkdtempSync(join(tmpdir(), "brand-hub-dist-"));
  await integration.hooks["astro:build:done"]!({ dir: pathToFileURL(dist + "/") } as never);
  const redirects = existsSync(join(dist, "_redirects")) ? readFileSync(join(dist, "_redirects"), "utf8") : "";
  rmSync(dist, { recursive: true, force: true });
  return { routes: injectRoute.mock.calls.map(([r]) => r.pattern as string), warnings: warn.mock.calls.map(([m]) => m as string), redirects };
}

const DATA_ROUTES = ["/office", "/guide/new-to-the-team", "/create/signature", "/descriptions"];

/** Adds signature.json, onboarding.json, and modules.office to a fixture copy. */
function addData(brandDir: string) {
  mkdirSync(join(brandDir, "files", "signatures"), { recursive: true });
  writeFileSync(join(brandDir, "files", "signatures", "basic.html"), "<p>{{name}}</p>");
  write(brandDir, "signature.json", JSON.stringify({
    fields: [{ id: "name", label: "Name" }],
    designs: [{ id: "basic", label: "Basic", template: "files/signatures/basic.html", fields: ["name"], variants: [{ id: "green", label: "Green", colors: { accent: "comet-green" } }] }],
  }));
  write(brandDir, "onboarding.json", JSON.stringify({ steps: [{ id: "fonts", title: "Install the fonts", links: [{ module: "fonts" }] }] }));
  const slots = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  edit(brandDir, "brand.json", (b: any) => void (b.modules = { office: { themeName: "Pocket Comet", colors: Object.fromEntries(slots.map((s) => [s, "comet-green"])), fonts: { major: "inter", minor: "inter" } } }));
}

describe("modules built from brand data", () => {
  it("builds a 0.2.2 config with every module listed and no 0.3 data: no new routes, redirects, or warnings", async () => {
    const { root } = demoCopy();
    const { routes, warnings, redirects } = await build(root, { brand: "demo" });
    for (const r of DATA_ROUTES) expect(routes).not.toContain(r);
    expect(routes).toEqual(expect.arrayContaining(["/logos", "/colors", "/fonts", "/guide", "/changes"]));
    expect(warnings).toEqual([]);
    expect(redirects).not.toMatch(/^\/(start|signature|boilerplate) /m);
    expect(redirects).toMatch(/^\/whats-new \/changes\/ 301!$/m);
  });

  it("builds a 0.2.2 config that lists only its own modules unchanged", async () => {
    const { root } = demoCopy();
    const { routes, warnings } = await build(root, { brand: "demo", modules: ["logos", "colors", "fonts", "icons", "guide", "changes"] });
    expect(routes.filter((r) => !r.includes("["))).toEqual(["/", "/search-index.json", "/logos", "/colors", "/fonts", "/icons", "/guide", "/changes"]);
    expect(warnings).toEqual([]);
  });

  it("turns office, start, and signature on once the brand has their data, with the 0.1 redirects", async () => {
    const { root, brandDir } = demoCopy();
    addData(brandDir);
    const { routes, warnings, redirects } = await build(root, { brand: "demo" });
    expect(routes).toEqual(expect.arrayContaining(["/office", "/guide/new-to-the-team", "/create/signature"]));
    expect(routes).not.toContain("/descriptions");
    expect(warnings).toEqual([]);
    expect(redirects).toMatch(/^\/start \/guide\/new-to-the-team\/ 301!$/m);
    expect(redirects).toMatch(/^\/signature \/create\/signature\/ 301!$/m);
  });

  it("keeps a module with data off when the config does not list it", async () => {
    const { root, brandDir } = demoCopy();
    addData(brandDir);
    const { routes } = await build(root, { brand: "demo", modules: ["logos"] });
    for (const r of DATA_ROUTES) expect(routes).not.toContain(r);
  });
});
