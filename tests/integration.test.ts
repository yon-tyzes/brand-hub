// The integration's config hook is what `astro build` runs first, so a failure here fails the build.
import { describe, expect, it, vi } from "vitest";
import { pathToFileURL } from "node:url";
import { BrandDataError } from "../src/content/load.ts";
import { brandHub, HubConfigError, resolveHubConfig, routesFor } from "../src/integration/index.ts";
import { demoCopy, edit, write } from "./helpers.ts";

async function runSetup(root: string, inline?: Parameters<typeof brandHub>[0]) {
  const injectRoute = vi.fn();
  const hook = brandHub(inline).hooks["astro:config:setup"]!;
  await hook({
    config: { root: pathToFileURL(root + "/") },
    injectRoute,
    updateConfig: vi.fn(),
    addWatchFile: vi.fn(),
  } as never);
  return injectRoute.mock.calls.map(([route]) => route.pattern as string);
}

/** Routes injected whatever the config: brand files, zips, and the search index. */
const ALWAYS = ["/files/[...path]", "/downloads/[name]", "/search-index.json"];

describe("brandHub integration", () => {
  it("loads hub.config.ts and injects routes for enabled modules only", async () => {
    const { root } = demoCopy();
    write(root, "hub.config.ts", 'export default { brand: "demo", modules: ["logos", "colors"] };\n');
    expect(await runSetup(root)).toEqual(["/", ...ALWAYS, "/logos", "/colors"]);
  });

  it("injects /admin only when admin is enabled", () => {
    const hub = (admin: boolean) => ({ brand: "demo", modules: ["icons" as const], admin: { enabled: admin } });
    expect(routesFor(hubConfigOf(hub(true))).map((r) => r.pattern)).toEqual(["/", ...ALWAYS, "/icons", "/admin"]);
    expect(routesFor(hubConfigOf(hub(false))).map((r) => r.pattern)).toEqual(["/", ...ALWAYS, "/icons"]);
  });

  it("injects rule pages only when the guide module is on", () => {
    const patterns = routesFor(hubConfigOf({ brand: "demo", modules: ["guide"], admin: { enabled: false } })).map((r) => r.pattern);
    expect(patterns).toEqual(["/", ...ALWAYS, "/guide", "/guide/[id]"]);
  });

  it("fails the build when demo data has a broken reference", async () => {
    const { root, brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[0].governedBy = ["no-such-rule"];
    });
    await expect(runSetup(root, { brand: "demo" })).rejects.toThrow(BrandDataError);
    await expect(runSetup(root, { brand: "demo" })).rejects.toThrow('governedBy: rule "no-such-rule" does not exist');
  });

  it("fails the build when demo data points to a missing file", async () => {
    const { root, brandDir } = demoCopy();
    edit(brandDir, "icons.json", (icons) => {
      icons[0].svgPath = "files/icons/gone.svg";
    });
    await expect(runSetup(root, { brand: "demo" })).rejects.toThrow(/icon-search": svgPath: file not found: .*gone\.svg/);
  });

  it("rejects an invalid hub config with the field and reason", async () => {
    const { root } = demoCopy();
    await expect(resolveHubConfig(root, { brand: "demo", modules: ["logos", "logos"] })).rejects.toThrow(HubConfigError);
    await expect(resolveHubConfig(root, { brand: "Demo Brand" })).rejects.toThrow(/brand: must be a kebab-case folder name/);
  });
});

function hubConfigOf(input: Parameters<typeof resolveHubConfig>[1]) {
  // Fill defaults the same way the integration does.
  return { search: { shortcut: [] }, indexing: false, uploads: { maxBytes: 1 }, ...input } as Parameters<typeof routesFor>[0];
}
