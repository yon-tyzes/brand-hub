// Astro integration. Loads hub.config.ts, validates the brand folder, injects one route per enabled
// module (plus / and, when enabled, /admin), and exposes config, content and theme CSS to pages
// through the `virtual:brand-hub` module.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { runnerImport, type Plugin } from "vite";
import { hubConfig, type HubConfig, type HubConfigInput } from "../../schemas/hub-config.ts";
import { loadBrand, type BrandContent } from "../content/load.ts";
import type { FontAsset } from "../../schemas/asset.ts";
import { fileUrl } from "../lib/paths.ts";
import { MODULES, type ModuleDef } from "../modules/registry.ts";
import { fontFaceCss } from "../theme/fonts.ts";
import { buildThemeCss } from "../theme/tokens.ts";

export const VIRTUAL_ID = "virtual:brand-hub";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export class HubConfigError extends Error {
  override name = "HubConfigError";
}

/** Validates an inline config, or loads and validates hub.config.ts from the project root. */
export async function resolveHubConfig(root: string, inline?: HubConfigInput): Promise<HubConfig> {
  let input: unknown = inline;
  let source = "brandHub() options";
  if (input === undefined) {
    const path = join(root, "hub.config.ts");
    source = "hub.config.ts";
    if (!existsSync(path)) throw new HubConfigError(`hub.config.ts not found in ${root}. Create it or pass a config to brandHub().`);
    const { module } = await runnerImport<{ default?: unknown }>(path, { root, configFile: false, logLevel: "error" });
    input = module.default;
  }
  const result = hubConfig.safeParse(input);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new HubConfigError(`${source} is invalid:\n${lines.join("\n")}`);
  }
  return result.data;
}

/** Route entry for each page and file the integration injects. */
export function routesFor(hub: HubConfig): { pattern: string; entrypoint: URL }[] {
  const modulesDir = new URL("../modules/", import.meta.url);
  const routesDir = new URL("../routes/", import.meta.url);
  const routes = [
    { pattern: "/", entrypoint: new URL("home/index.astro", modulesDir) },
    { pattern: "/files/[...path]", entrypoint: new URL("files.ts", routesDir) },
    { pattern: "/downloads/[name]", entrypoint: new URL("downloads.ts", routesDir) },
    { pattern: "/search-index.json", entrypoint: new URL("search-index.json.ts", routesDir) },
  ];
  for (const id of hub.modules) routes.push({ pattern: MODULES[id].route, entrypoint: new URL(`${id}/index.astro`, modulesDir) });
  if (hub.modules.includes("guide")) routes.push({ pattern: "/guide/[id]", entrypoint: new URL("guide/rule.astro", modulesDir) });
  if (hub.admin.enabled) routes.push({ pattern: "/admin", entrypoint: new URL("../admin/index.astro", import.meta.url) });
  return routes;
}

const ENGINE_VERSION: string = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;

export interface VirtualData {
  /** Absolute path of brands/<slug>/. Build-time code only. */
  brandDir: string;
  engineVersion: string;
  config: HubConfig;
  modules: ModuleDef[];
  brand: BrandContent["brand"];
  content: Pick<BrandContent, "assets" | "rules" | "pending" | "changelog">;
  themeCss: string;
  /** @font-face rules for the brand's locked font assets. */
  fontCss: string;
}

function virtualModule(data: VirtualData): Plugin {
  return {
    name: "brand-hub:virtual",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load: (id) =>
      id === RESOLVED_ID
        ? Object.entries(data).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join("\n")
        : undefined,
  };
}

export function brandHub(config?: HubConfigInput): AstroIntegration {
  return {
    name: "@yon-tyzes/brand-hub",
    hooks: {
      "astro:config:setup": async ({ config: astroConfig, injectRoute, updateConfig, addWatchFile }) => {
        const root = fileURLToPath(astroConfig.root);
        const hub = await resolveHubConfig(root, config);
        if (!config) addWatchFile(join(root, "hub.config.ts"));

        const brandDir = join(root, "brands", hub.brand);
        const content = loadBrand(brandDir);
        for (const name of readdirSync(brandDir)) if (name.endsWith(".json")) addWatchFile(join(brandDir, name));

        for (const route of routesFor(hub)) injectRoute({ ...route, prerender: true });

        const fonts = content.assets.filter((a): a is FontAsset => a.type === "font");
        const data: VirtualData = {
          brandDir,
          engineVersion: ENGINE_VERSION,
          config: hub,
          modules: hub.modules.map((id) => MODULES[id]),
          brand: content.brand,
          content: { assets: content.assets, rules: content.rules, pending: content.pending, changelog: content.changelog },
          themeCss: buildThemeCss(content.brand.tokens),
          fontCss: fontFaceCss(fonts, fileUrl),
        };
        updateConfig({ vite: { plugins: [virtualModule(data)] } });
      },
    },
  };
}
