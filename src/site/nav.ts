// Site navigation (spec section 6, Navigation): the three top tabs and which one a path belongs to.
// Pure data built from the site, shared by the build and the editor's preview.
import { MODULES, type ModuleDef } from "../modules/registry.ts";
import type { Site } from "./data.ts";

export type NavTabId = "library" | "guide" | "create";

export interface NavTab {
  id: NavTabId;
  label: string;
  href: string;
}

const TAB_LABEL: Record<NavTabId, string> = { library: "Library", guide: "Brand guide", create: "Create" };
const TAB_ORDER: NavTabId[] = ["library", "guide", "create"];

const modulesIn = (site: Site, tab: NavTabId): ModuleDef[] => site.modules.filter((m) => m.tab === tab);

/** True when `path` is `route` or a page under it. Paths and routes have no trailing slash. */
export const isUnder = (path: string, route: string) => path === route || path.startsWith(`${route}/`);

/**
 * Tabs with something to show, in order. Library always has the home page. A tab with no enabled
 * modules is hidden: with `signature` off there is no Create tab.
 */
export function navTabs(site: Site): NavTab[] {
  const tabs: NavTab[] = [];
  for (const id of TAB_ORDER) {
    const mods = modulesIn(site, id);
    if (id !== "library" && !mods.length) continue;
    const href = id === "library" ? "/" : id === "guide" && site.isEnabled("guide") ? MODULES.guide.route : mods[0]!.route;
    tabs.push({ id, label: TAB_LABEL[id], href });
  }
  return tabs;
}

/** The tab a page belongs to. Pages outside every tab (the change log) belong to none. */
export function currentTab(site: Site, path: string): NavTabId | undefined {
  if (path === "/") return "library";
  for (const m of site.modules) {
    if (m.tab !== "footer" && isUnder(path, m.route)) return m.tab;
  }
  return undefined;
}
