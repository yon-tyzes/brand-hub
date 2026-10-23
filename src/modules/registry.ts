// Route, nav label, and menu help line for each module. Labels are plain words (docs/STANDARDS.md).
import type { ModuleId } from "../../schemas/hub-config.ts";
import type { AssetType } from "../../schemas/asset.ts";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  route: string;
  /** One line under the label in the module menu. */
  help: string;
  /** UI icon shown in the module menu (src/lib/ui-icons.ts). */
  icon: string;
  /** Asset type whose items render on this module's page, if any. */
  assetType?: AssetType;
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  start: { id: "start", label: "Start", route: "/start", help: "First steps for new team members", icon: "flag" },
  logos: { id: "logos", label: "Logos", route: "/logos", help: "Lockups and file downloads", icon: "logo", assetType: "logo" },
  colors: { id: "colors", label: "Colors", route: "/colors", help: "Values in HEX, RGB, CMYK, and PMS", icon: "palette", assetType: "color" },
  fonts: { id: "fonts", label: "Fonts", route: "/fonts", help: "Font files and install steps", icon: "type", assetType: "font" },
  icons: { id: "icons", label: "Icons", route: "/icons", help: "Icon library with SVG and PNG export", icon: "grid", assetType: "icon" },
  photos: { id: "photos", label: "Photos", route: "/photos", help: "Photo library and photo rules", icon: "image", assetType: "photo-source" },
  templates: { id: "templates", label: "Templates", route: "/templates", help: "Ready-made files and their rules", icon: "layout", assetType: "template" },
  signature: { id: "signature", label: "Signature", route: "/signature", help: "Email signature generator", icon: "pen" },
  boilerplate: { id: "boilerplate", label: "Boilerplate", route: "/boilerplate", help: "Approved descriptions in three lengths", icon: "text" },
  guide: { id: "guide", label: "Guide", route: "/guide", help: "Brand rules", icon: "book" },
  "whats-new": { id: "whats-new", label: "What's new", route: "/whats-new", help: "Recent changes and work in progress", icon: "clock" },
};

/** Modules that list assets, in menu order. */
export const ASSET_MODULES: ModuleId[] = ["logos", "colors", "fonts", "icons", "photos", "templates"];
