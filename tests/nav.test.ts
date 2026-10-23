import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ModuleId } from "../schemas/hub-config.ts";
import { loadBrand } from "../src/content/load.ts";
import { createSite } from "../src/site/data.ts";
import { currentTab, navTabs, sidebarFor } from "../src/site/nav.ts";
import { netlifyRedirects, redirectsFor } from "../src/site/redirects.ts";
import { demoCopy, edit } from "./helpers.ts";

/** A site over the fixture brand with the given modules on. */
function siteWith(modules: ModuleId[], change?: (brandDir: string) => void) {
  const { brandDir } = demoCopy();
  change?.(brandDir);
  const c = loadBrand(brandDir);
  return createSite({
    brand: c.brand, config: { modules, indexing: false, search: { shortcut: ["mod+k"] } }, engineVersion: "0.2.0",
    assets: c.assets, rules: c.rules, changelog: c.changelog, urlFor: (p) => `/files/${p}`, svgFor: () => undefined,
  });
}

describe("top tabs", () => {
  it("hides a tab with no enabled modules", () => {
    expect(navTabs(siteWith(["logos", "guide"])).map((t) => t.label)).toEqual(["Library", "Brand guide"]);
    expect(navTabs(siteWith(["logos"])).map((t) => t.label)).toEqual(["Library"]);
    expect(navTabs(siteWith(["logos", "guide", "signature"])).map((t) => [t.label, t.href])).toEqual([
      ["Library", "/"], ["Brand guide", "/guide"], ["Create", "/create/signature"],
    ]);
  });

  it("points Brand guide at New to the team when the guide itself is off", () => {
    expect(navTabs(siteWith(["start"])).find((t) => t.id === "guide")?.href).toBe("/guide/new-to-the-team");
  });

  it("knows which tab a page is in", () => {
    const site = siteWith(["logos", "guide", "start", "signature", "changes"]);
    expect(["/", "/logos", "/guide", "/guide/color-use", "/guide/new-to-the-team", "/create/signature", "/changes"].map((p) => currentTab(site, p)))
      .toEqual(["library", "library", "guide", "guide", "guide", "create", undefined]);
  });
});

describe("sidebar", () => {
  it("lists All files first, then each Library module with its count", () => {
    const nav = sidebarFor(siteWith(["colors", "fonts", "icons", "guide"]), "/");
    expect(nav.label).toBe("Library");
    expect(nav.items.map((i) => [i.label, i.count])).toEqual([["All files", undefined], ["Colors", 2], ["Fonts", 1], ["Icons", 5]]);
    expect(nav.current).toBe("home");
    expect(nav.items[0]!.icon).toBe("home");
  });

  it("marks the current page, and shows the Library for pages outside every tab", () => {
    const site = siteWith(["colors", "fonts", "changes"]);
    expect(sidebarFor(site, "/fonts").current).toBe("fonts");
    expect(sidebarFor(site, "/changes")).toMatchObject({ tab: "library", current: undefined });
  });

  it("lists New to the team, then the guide chapters that have rules", () => {
    const nav = sidebarFor(siteWith(["guide", "start"], (dir) => edit(dir, "brand.json", (b) => {
      b.guide.chapters.push({ id: "empty", title: "Empty" });
    })), "/guide/color-use");
    expect(nav.items.map((i) => [i.label, i.href])).toEqual([["New to the team", "/guide/new-to-the-team"], ["Color use", "/guide/color-use"]]);
    expect(nav.current).toBe("chapter:color-use");
  });

  it("links Photos straight to the library when the brand has one, with no count", () => {
    const photo = { id: "photo-library", label: "Photo library", status: "locked", version: "1.0", updated: "2026-10-23", audience: "public",
      type: "photo-source", provider: "drive", url: "https://example.com/photos", access: "open", guidelines: [] };
    const nav = sidebarFor(siteWith(["photos"], (dir) => writeFileSync(join(dir, "photos.json"), JSON.stringify([photo]))), "/");
    expect(nav.items[1]).toEqual({ id: "photos", label: "Photos", href: "https://example.com/photos", icon: "image", external: true });
  });
});

describe("redirects from 0.1 routes", () => {
  it("moves each 0.1 route to its 0.2 page, and each rule page to its chapter", () => {
    const site = siteWith(["guide", "start", "signature", "boilerplate", "changes"]);
    expect(redirectsFor(site)).toEqual([
      { from: "/start", to: "/guide/new-to-the-team/" },
      { from: "/signature", to: "/create/signature/" },
      { from: "/boilerplate", to: "/descriptions/" },
      { from: "/whats-new", to: "/changes/" },
      { from: "/guide/one-green-action", to: "/guide/color-use/#one-green-action" },
    ]);
  });

  it("only redirects to pages that exist", () => {
    expect(redirectsFor(siteWith(["logos", "changes"]))).toEqual([{ from: "/whats-new", to: "/changes/" }]);
  });

  it("writes Netlify rules that apply over the redirect pages", () => {
    expect(netlifyRedirects([{ from: "/whats-new", to: "/changes/" }])).toBe("/whats-new /changes/ 301!\n");
  });
});
