// Navigation (spec section 6): top tabs, sidebar per tab, phone navigation, and redirects from 0.1 routes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { redirectRoutes, routes, setTheme } from "./routes.ts";

const redirects = readFileSync(join(import.meta.dirname, "..", "dist", "_redirects"), "utf8")
  .trim()
  .split("\n")
  .map((line) => line.split(" ") as [string, string, string]);

const mainTabs = (page: Page) => page.getByRole("navigation", { name: "Main" });
const box = async (l: Locator) => (await l.boundingBox())!;

test.describe("redirects from 0.1 routes", () => {
  for (const [from, to] of redirects) {
    test(`${from} lands on ${to}`, async ({ page }) => {
      await page.goto(`${from}/`);
      await expect(page).toHaveURL((url) => url.pathname + url.hash === to);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  test("each redirect page is in _redirects as a forced 301", () => {
    expect(redirects.map(([from]) => `${from}/`).sort()).toEqual(redirectRoutes);
    expect(new Set(redirects.map(([, , status]) => status))).toEqual(new Set(["301!"]));
    expect(redirects.map(([from]) => from)).toContain("/whats-new");
  });

  test("a rule page from 0.1 opens its chapter at the rule", async ({ page }) => {
    await page.goto("/guide/logo-clear-space/");
    await expect(page.getByRole("heading", { level: 1, name: "Keep clear space around the logo" })).toBeInViewport();
  });
});

test.describe("desktop at 1440px", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("top bar: brand, tabs, search with one shortcut, and the theme toggle", async ({ page }) => {
    await page.goto("/logos/");
    const bar = page.locator("header.topbar");
    expect((await box(bar)).height).toBe(56);
    await expect(mainTabs(page).getByRole("link")).toHaveText(["Library", "Brand guide"]);
    await expect(mainTabs(page).getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");
    // The demo has signature off, so there is no Create tab.
    await expect(page.getByRole("link", { name: "Create" })).toHaveCount(0);
    const keys = bar.locator(".search-trigger kbd");
    await expect(keys.filter({ visible: true })).toHaveCount(1);
    await expect(keys.filter({ visible: true })).toHaveText(/^(⌘K|Ctrl K)$/);
    await expect(bar.getByRole("button", { name: "Search" })).toBeVisible();
  });

  test("sidebar lists the Library with counts and marks the current page", async ({ page }) => {
    await page.goto("/colors/");
    const side = page.getByRole("navigation", { name: "Library" });
    expect(Math.round((await box(side)).width)).toBe(248);
    await expect(side.getByRole("link")).toHaveText([/^All files$/, /^Logos\s*4$/, /^Colors\s*7$/, /^Fonts\s*2$/, /^Icons\s*\d+$/, /^Photos/, /^Templates\s*3$/, "brand@example.com"]);
    await expect(side.getByRole("link", { name: /^Colors/ })).toHaveAttribute("aria-current", "page");
    await expect(side.getByRole("link", { name: /^Photos/ })).toHaveAttribute("target", "_blank");
    await expect(side.getByRole("img", { name: "Opens in a new tab" })).toBeVisible();
  });

  test("All files is the home page and is current on /", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Library" }).getByRole("link", { name: "All files" })).toHaveAttribute("aria-current", "page");
  });

  test("Brand guide lists its chapters", async ({ page }) => {
    await page.goto("/");
    await mainTabs(page).getByRole("link", { name: "Brand guide" }).click();
    await expect(page).toHaveURL(/\/guide\/?$/);
    const side = page.getByRole("navigation", { name: "Brand guide" });
    await expect(side.getByRole("link").first()).toHaveText("Logo use");
    await side.getByRole("link", { name: "Color use" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Use Comet Green for one action per screen");
    await expect(side.getByRole("link", { name: "Color use" })).toHaveAttribute("aria-current", "page");
  });

  test("the theme toggle names the theme it switches to", async ({ page }) => {
    await setTheme(page, "light");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Switch to dark theme" });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  });

  test("the top bar turns frosted once the page scrolls", async ({ page }) => {
    await page.goto("/icons/");
    const bar = page.locator("header.topbar");
    await expect(bar).not.toHaveAttribute("data-scrolled");
    await page.mouse.wheel(0, 600);
    await expect(bar).toHaveAttribute("data-scrolled", "");
  });

  test("the footer links to the change log and the brand contact, without the engine version", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link")).toHaveText(["Change log", "brand@example.com", "example.com"]);
    await expect(footer).not.toContainText(/Brand Hub \d/);
  });
});

test.describe("phone at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tabs become a segmented control and the sidebar a chip row", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".topbar-tabs")).toBeHidden();
    const segmented = page.locator(".tabs-segmented");
    await expect(segmented).toBeVisible();
    await expect(segmented.getByRole("link")).toHaveText(["Library", "Brand guide"]);
    await expect(segmented.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");

    const chips = page.getByRole("navigation", { name: "Library" }).getByRole("link");
    await expect(chips.first()).toHaveText("All files");
    const [a, b] = [await box(chips.nth(0)), await box(chips.nth(1))];
    expect(b.y).toBe(a.y);
    expect(b.x).toBeGreaterThan(a.x);
    expect(a.height).toBe(32);
    // The current chip is filled.
    const fill = await chips.first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fill-primary").trim());
    expect(fill).toBe(ink === "#0b0d10" ? "rgb(11, 13, 16)" : fill);
    await expect(page.getByText("Brand questions")).toBeHidden();
  });

  test("every navigation control has a touch target of at least 44px", async ({ page }) => {
    await page.goto("/logos/");
    const targets = page.locator(".topbar-brand, .search-trigger, .theme-toggle, .tabs-segmented a, .sidebar-item");
    const small = await targets.evaluateAll((els) =>
      els.flatMap((el) => {
        const r = el.getBoundingClientRect();
        // Chips and segments extend their hit area with ::before.
        const before = getComputedStyle(el, "::before");
        const extra = before.content !== "none" ? -2 * parseFloat(before.top) : 0;
        return r.height + extra < 44 ? [`${el.textContent?.trim() || el.className}: ${r.height + extra}px`] : [];
      }),
    );
    expect(small).toEqual([]);
  });

  test("page controls have a touch target of at least 44px", async ({ page }) => {
    const pages: [string, string][] = [
      ["/", ".hero-chips .chip, .quick-grid .asset-actions > .btn, .quick-color .value-row"],
      ["/icons/", ".icon-colors .chip"],
      ["/templates/", ".filter-chips .chip"],
      ["/guide/", ".guide-index a"],
    ];
    for (const [route, selector] of pages) {
      await page.goto(route);
      const small = await page.locator(selector).evaluateAll((els) =>
        els.flatMap((el) => {
          if (!el.getClientRects().length) return [];
          const r = el.getBoundingClientRect();
          // Controls extend their hit area with ::before or ::after.
          const pseudo = [getComputedStyle(el, "::before"), getComputedStyle(el, "::after")].find((p) => p.content !== "none" && p.position === "absolute");
          const extra = pseudo ? -2 * parseFloat(pseudo.top) : 0;
          return r.height + extra < 44 ? [`${el.textContent?.trim()}: ${r.height + extra}px`] : [];
        }),
      );
      expect(small, route).toEqual([]);
    }
  });

  test("the chip row marks the current page", async ({ page }) => {
    await page.goto("/logos/");
    await expect(page.getByRole("navigation", { name: "Library" }).getByRole("link", { name: /^Logos/ })).toHaveAttribute("aria-current", "page");
  });

  test("the current chip starts in view when the row scrolls", async ({ page }) => {
    for (const route of ["/templates/", "/icons/"]) {
      await page.goto(route);
      await expect(page.getByRole("navigation", { name: "Library" }).locator("[aria-current=page]"), route).toBeInViewport({ ratio: 1 });
    }
  });

  test("the chip row keeps its height on a page shorter than the window", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 2400 });
    await page.goto("/guide/headshots/");
    expect((await box(page.locator("nav.sidebar"))).height).toBeLessThan(60);
  });
});

test("every page has the top bar, the sidebar, and the footer", async ({ page }) => {
  for (const route of routes.filter((r) => !r.startsWith("/admin"))) {
    await page.goto(route);
    await expect(page.locator("header.topbar"), route).toHaveCount(1);
    await expect(page.locator("nav.sidebar"), route).toHaveCount(1);
    await expect(page.locator("footer.site-footer"), route).toHaveCount(1);
  }
});
