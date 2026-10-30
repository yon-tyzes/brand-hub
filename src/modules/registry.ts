// Route, label, tab, and sidebar icon for each module (spec section 6). Labels are plain words (docs/STANDARDS.md).
import type { ModuleId } from "../../schemas/hub-config.ts";
import type { Asset, AssetType } from "../../schemas/asset.ts";
import type { Brand } from "../../schemas/brand.ts";
import type { Onboarding } from "../../schemas/onboarding.ts";
import type { Signature } from "../../schemas/signature.ts";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  route: string;
  /** One line on what the page holds. */
  help: string;
  /** UI icon shown in the sidebar (src/lib/ui-icons.ts). */
  icon: string;
  /** Asset type whose items render on this module's page, if any. */
  assetType?: AssetType;
  /** Top tab whose sidebar lists the module. Footer modules are linked from the footer only. */
  tab: TabId;
}

export type TabId = "library" | "guide" | "create" | "footer";

export const MODULES: Record<ModuleId, ModuleDef> = {
  logos: { id: "logos", label: "Logos", route: "/logos", help: "Lockups and file downloads", icon: "logo", assetType: "logo", tab: "library" },
  colors: { id: "colors", label: "Colors", route: "/colors", help: "Values in HEX, RGB, CMYK, and PMS", icon: "palette", assetType: "color", tab: "library" },
  fonts: { id: "fonts", label: "Fonts", route: "/fonts", help: "Font files and install steps", icon: "type", assetType: "font", tab: "library" },
  icons: { id: "icons", label: "Icons", route: "/icons", help: "Icon library with SVG and PNG export", icon: "grid", assetType: "icon", tab: "library" },
  photos: { id: "photos", label: "Photos", route: "/photos", help: "Photo library and photo rules", icon: "image", assetType: "photo-source", tab: "library" },
  templates: { id: "templates", label: "Templates", route: "/templates", help: "Ready-made files and their rules", icon: "layout", assetType: "template", tab: "library" },
  office: { id: "office", label: "Office theme", route: "/office", help: "Theme file for Word and PowerPoint", icon: "download", tab: "library" },
  boilerplate: { id: "boilerplate", label: "Company descriptions", route: "/descriptions", help: "Approved descriptions in three lengths", icon: "text", tab: "library" },
  guide: { id: "guide", label: "Brand guide", route: "/guide", help: "Brand rules by chapter", icon: "book", tab: "guide" },
  start: { id: "start", label: "New to the team", route: "/guide/new-to-the-team", help: "First steps for new team members", icon: "flag", tab: "guide" },
  signature: { id: "signature", label: "Email signature", route: "/create/signature", help: "Email signature generator", icon: "pen", tab: "create" },
  changes: { id: "changes", label: "Change log", route: "/changes", help: "Published changes, newest first", icon: "clock", tab: "footer" },
};

/** Brand data a module's page is built from. */
export interface ModuleData {
  brand: Brand;
  /** Locked assets. */
  assets: Asset[];
  signature?: Signature;
  onboarding?: Onboarding;
}

/** Modules whose page is built from brand data, and whether the brand has it (spec section 4). */
const HAS_DATA: Partial<Record<ModuleId, (d: ModuleData) => boolean>> = {
  office: (d) => d.brand.modules.office !== undefined,
  start: (d) => (d.onboarding?.steps.length ?? 0) > 0,
  signature: (d) => (d.signature?.designs.length ?? 0) > 0,
  boilerplate: (d) => d.assets.some((a) => a.type === "boilerplate"),
};

/** The listed modules that have something to show. A module without its data gets no page, nav item, search entry, or redirect. */
export const modulesWithData = (ids: ModuleId[], data: ModuleData): ModuleId[] => ids.filter((id) => HAS_DATA[id]?.(data) ?? true);
