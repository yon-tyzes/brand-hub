// Astro integration. Loads hub.config.ts, validates the brand folder, injects one route per enabled
// module (plus /, the guide chapters, redirects from 0.1 routes, and, when enabled, /admin), writes
// dist/_redirects, and exposes config, content and theme CSS to pages
// through the `virtual:brand-hub` module.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { runnerImport, type Plugin } from "vite";
import { hubConfig, MODULE_ALIASES, type HubConfig, type HubConfigInput } from "../../schemas/hub-config.ts";
import { formatWarning, loadBrand, type BrandContent } from "../content/load.ts";
import type { FontAsset } from "../../schemas/asset.ts";
import { fileUrl } from "../lib/paths.ts";
import { MODULES, type ModuleDef } from "../modules/registry.ts";
import { createSite } from "../site/data.ts";
import { netlifyRedirects, redirectsFor, type Redirect } from "../site/redirects.ts";
import { fontFaceCss } from "../theme/fonts.ts";
import { buildThemeCss } from "../theme/tokens.ts";

export const VIRTUAL_ID = "virtual:brand-hub";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
/** The editor's adapters, chosen in hub.config.ts. Imported only by the editor. */
export const ADMIN_ID = "virtual:brand-hub/admin";
const RESOLVED_ADMIN_ID = `\0${ADMIN_ID}`;

export class HubConfigError extends Error {
  override name = "HubConfigError";
}

/**
 * Validates an inline config, or loads and validates hub.config.ts from the project root. 0.1 module ids are
 * read as their 0.2 id and reported through `warn`.
 */
export async function resolveHubConfig(root: string, inline?: HubConfigInput, warn: (message: string) => void = () => {}): Promise<HubConfig> {
  let input: unknown = inline;
  let source = "brandHub() options";
  if (input === undefined) {
    const path = join(root, "hub.config.ts");
    source = "hub.config.ts";
    if (!existsSync(path)) throw new HubConfigError(`hub.config.ts not found in ${root}. Create it or pass a config to brandHub().`);
    const { module } = await runnerImport<{ default?: unknown }>(path, { root, configFile: false, logLevel: "error" });
    input = module.default;
  }
  const modules = (input as { modules?: unknown } | undefined)?.modules;
  for (const m of Array.isArray(modules) ? modules : []) {
    if (typeof m === "string" && MODULE_ALIASES[m]) warn(`${source}: module "${m}" is now "${MODULE_ALIASES[m]}". Rename it in modules.`);
  }
  const result = hubConfig.safeParse(input);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new HubConfigError(`${source} is invalid:\n${lines.join("\n")}`);
  }
  return result.data;
}

export type Command = "dev" | "build" | "preview" | "sync";

/** The adapter a config names for this command: a built-in name or a module path. */
export function adapterFor(choice: HubConfig["admin"]["adapter"], command: Command): string {
  return typeof choice === "string" ? choice : command === "dev" ? choice.dev : choice.build;
}

const BUILT_IN = new Set(["local", "demo"]);

/** Module path for an adapter: built-ins ship with the engine; anything else is relative to the project. */
export function adapterModule(spec: string, kind: "content" | "auth", root: string): string {
  if (BUILT_IN.has(spec)) return fileURLToPath(new URL(`../adapters/${spec}/${kind}.ts`, import.meta.url));
  return isAbsolute(spec) ? spec : join(root, spec);
}

/** Route entry for each page and file the integration injects. */
export function routesFor(hub: HubConfig, command: Command = "build"): { pattern: string; entrypoint: URL; prerender: boolean }[] {
  const modulesDir = new URL("../modules/", import.meta.url);
  const routesDir = new URL("../routes/", import.meta.url);
  const page = (pattern: string, entrypoint: URL) => ({ pattern, entrypoint, prerender: true });
  const routes = [
    page("/", new URL("home/index.astro", modulesDir)),
    page("/files/[...path]", new URL("files.ts", routesDir)),
    page("/downloads/[name]", new URL("downloads.ts", routesDir)),
    page("/search-index.json", new URL("search-index.json.ts", routesDir)),
  ];
  for (const id of hub.modules) routes.push(page(MODULES[id].route, new URL(`${id}/index.astro`, modulesDir)));
  if (hub.modules.includes("guide")) routes.push(page("/guide/[chapter]", new URL("guide/chapter.astro", modulesDir)));
  // Moved 0.1 routes (src/site/redirects.ts). Last, so every real page wins over it.
  routes.push(page("/[...legacy]", new URL("redirect.astro", routesDir)));
  if (hub.admin.enabled) {
    const adapter = adapterFor(hub.admin.adapter, command);
    routes.push(page("/admin", new URL("../admin/index.astro", import.meta.url)));
    routes.push(page("/admin/preview", new URL("../admin/preview.astro", import.meta.url)));
    // The demo adapter reads a snapshot of every record, drafts included: only built for the demo.
    if (adapter === "demo") routes.push(page("/admin/data.json", new URL("admin-data.json.ts", routesDir)));
    // The local adapter writes to disk through an endpoint that exists only under `astro dev`.
    if (adapter === "local" && command === "dev") routes.push({ pattern: "/admin/api/local/[action]", entrypoint: new URL("admin-local-api.ts", routesDir), prerender: false });
  }
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

function virtualModule(data: VirtualData, adapters: { content: string; auth: string; mode: string }): Plugin {
  return {
    name: "brand-hub:virtual",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : id === ADMIN_ID ? RESOLVED_ADMIN_ID : undefined),
    load: (id) => {
      if (id === RESOLVED_ID) return Object.entries(data).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`).join("\n");
      if (id === RESOLVED_ADMIN_ID) {
        return [
          `import content from ${JSON.stringify(adapters.content)};`,
          `import auth from ${JSON.stringify(adapters.auth)};`,
          `export { content, auth };`,
          `export const mode = ${JSON.stringify(adapters.mode)};`,
        ].join("\n");
      }
      return undefined;
    },
  };
}

export function brandHub(config?: HubConfigInput): AstroIntegration {
  let redirects: Redirect[] = [];
  return {
    name: "@yon-tyzes/brand-hub",
    hooks: {
      "astro:config:setup": async ({ config: astroConfig, command, injectRoute, updateConfig, addWatchFile, logger }) => {
        const root = fileURLToPath(astroConfig.root);
        const hub = await resolveHubConfig(root, config, (m) => logger.warn(m));
        if (!config) addWatchFile(join(root, "hub.config.ts"));

        const brandDir = join(root, "brands", hub.brand);
        const content = loadBrand(brandDir);
        for (const w of content.warnings) logger.warn(formatWarning(w));
        for (const name of readdirSync(brandDir)) if (name.endsWith(".json")) addWatchFile(join(brandDir, name));

        for (const route of routesFor(hub, command)) injectRoute(route);
        const adapter = adapterFor(hub.admin.adapter, command);
        const auth = adapterFor(hub.admin.auth, command);
        if (hub.admin.enabled && command === "build" && (adapter === "local" || auth === "local")) {
          logger.warn("admin uses the local adapter, which only works under `astro dev`. The built editor will not load or save. Set admin.adapter and admin.auth for production.");
        }

        const fonts = content.assets.filter((a): a is FontAsset => a.type === "font");
        const data: VirtualData = {
          brandDir,
          engineVersion: ENGINE_VERSION,
          config: hub,
          modules: hub.modules.map((id) => MODULES[id]),
          brand: content.brand,
          content: { assets: content.assets, rules: content.rules, pending: content.pending, changelog: content.changelog },
          themeCss: buildThemeCss(),
          fontCss: fontFaceCss(fonts, fileUrl),
        };
        const adapters = { content: adapterModule(adapter, "content", root), auth: adapterModule(auth, "auth", root), mode: adapter };
        updateConfig({ vite: { plugins: [virtualModule(data, adapters)] } });
        redirects = redirectsFor(
          createSite({ assets: content.assets, rules: content.rules, changelog: content.changelog, brand: content.brand, config: hub, engineVersion: ENGINE_VERSION, urlFor: fileUrl, svgFor: () => undefined }),
        );
      },
      // Netlify serves these as real 301s; other hosts use the redirect pages.
      "astro:build:done": ({ dir }) => {
        if (redirects.length) writeFileSync(new URL("_redirects", dir), netlifyRedirects(redirects));
      },
    },
  };
}
