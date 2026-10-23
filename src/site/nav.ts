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

export interface NavItem {
  id: string;
  label: string;
  href: string;
  /** Engine UI icon (src/lib/ui-icons.ts). Brand guide chapters have none. */
  icon?: string;
  /** Items on the page. Omitted for links that leave the site. */
  count?: number;
  /** Opens another site in a new tab. */
  external?: boolean;
}

export interface Sidebar {
  tab: NavTabId;
  label: string;
  items: NavItem[];
  /** Item id of the current page, if it is in this sidebar. */
  current?: string;
}

/** Photos is a single link when the brand has one photo library: the sidebar goes straight to it. */
function photosItem(site: Site, m: ModuleDef): NavItem {
  const sources = site.assetsOfType("photo-source");
  if (sources.length === 1) return { id: m.id, label: m.label, href: sources[0]!.url, icon: m.icon, external: true };
  return { id: m.id, label: m.label, href: m.route, icon: m.icon, count: sources.length };
}

function moduleItem(site: Site, m: ModuleDef): NavItem {
  if (m.id === "photos") return photosItem(site, m);
  const item: NavItem = { id: m.id, label: m.label, href: m.route, icon: m.icon };
  if (m.id === "templates") item.count = site.assetsOfType("template").filter((t) => site.templateLinks(t).length > 0).length;
  else if (m.assetType) item.count = site.assetsOfType(m.assetType).length;
  return item;
}

/** Chapters from guide.chapters that have at least one rule on the site, in reading order. */
export function guideChapters(site: Site) {
  const used = new Set(site.rules.map((r) => r.chapter));
  return site.brand.guide.chapters.filter((c) => used.has(c.id));
}

export const chapterHref = (id: string) => `${MODULES.guide.route}/${id}`;

function itemsFor(site: Site, tab: NavTabId): NavItem[] {
  const mods = modulesIn(site, tab);
  if (tab === "library") return [{ id: "home", label: "All files", href: "/", icon: "home" }, ...mods.map((m) => moduleItem(site, m))];
  if (tab === "guide") {
    const start = mods.filter((m) => m.id !== "guide").map((m) => moduleItem(site, m));
    const chapters = site.isEnabled("guide") ? guideChapters(site).map((c) => ({ id: `chapter:${c.id}`, label: c.title, href: chapterHref(c.id) })) : [];
    return [...start.map(({ icon: _icon, ...rest }) => rest), ...chapters];
  }
  return mods.map((m) => moduleItem(site, m));
}

/** The sidebar for a page: its tab's items, or the Library's for pages outside every tab. */
export function sidebarFor(site: Site, path: string): Sidebar {
  const tab = currentTab(site, path) ?? "library";
  const items = itemsFor(site, tab);
  const current =
    path === "/" ? "home" : [...items].reverse().find((i) => !i.external && i.href !== "/" && isUnder(path, i.href))?.id;
  return { tab, label: TAB_LABEL[tab], items, current };
}
