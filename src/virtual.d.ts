// Types for the module the integration serves to pages (src/integration/index.ts).
type BrandHubVirtualData = import("./integration/index.ts").VirtualData;

declare module "virtual:brand-hub" {
  export const brandDir: BrandHubVirtualData["brandDir"];
  export const engineVersion: BrandHubVirtualData["engineVersion"];
  export const config: BrandHubVirtualData["config"];
  export const modules: BrandHubVirtualData["modules"];
  export const brand: BrandHubVirtualData["brand"];
  export const content: BrandHubVirtualData["content"];
  export const themeCss: BrandHubVirtualData["themeCss"];
  export const fontCss: BrandHubVirtualData["fontCss"];
}

declare module "virtual:brand-hub/admin" {
  export const content: import("./adapters/types.ts").ContentAdapter;
  export const auth: import("./adapters/types.ts").AuthAdapter;
  /** The content adapter's name: "local", "demo", or the module path. */
  export const mode: string;
}
