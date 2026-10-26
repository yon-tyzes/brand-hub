// Dark theme checks for brand content: logo previews keep the ground their logo was made for.
import { expect, test, type Locator } from "@playwright/test";
import { setTheme } from "./routes.ts";

/** WCAG relative luminance of an element's computed background color. */
const luminance = (el: Locator) =>
  el.evaluate((node) => {
    const [r, g, b] = (getComputedStyle(node).backgroundColor.match(/[\d.]+/g) ?? []).map(Number).map((c) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  });

test.describe("dark theme", () => {
  test.beforeEach(({ page }) => setTheme(page, "dark"));

  test("the full color horizontal logo keeps its light ground everywhere it is previewed", async ({ page }) => {
    await page.goto("/");
    const quick = page.locator("#quick-downloads + .library-grid .asset-card", { has: page.getByRole("heading", { name: "Horizontal logo", exact: true }) });
    expect(await luminance(quick.locator(".asset-well"))).toBeGreaterThan(0.8);
    const preview = page.locator(".preview-logos .asset-card", { has: page.getByRole("heading", { name: "Horizontal logo", exact: true }) });
    expect(await luminance(preview.locator(".asset-well"))).toBeGreaterThan(0.8);

    await page.goto("/logos/");
    expect(await luminance(page.locator("#logo-horizontal .asset-well"))).toBeGreaterThan(0.8);

    await page.keyboard.press("/");
    await page.getByRole("dialog", { name: "Search the brand" }).getByRole("searchbox").fill("horizontal logo");
    const thumb = page.locator(".search-result", { hasText: /^Horizontal logo(?!, reversed)/ }).locator(".result-thumb").first();
    await expect(thumb).toBeVisible();
    expect(await luminance(thumb)).toBeGreaterThan(0.8);
  });

  test("guide examples put the full color logo on the light ground", async ({ page }) => {
    await page.goto("/guide/logo-use/");
    const ground = page.locator(".example-well > div", { has: page.getByAltText(/on its light background/) });
    expect(await luminance(ground)).toBeGreaterThan(0.8);
  });
});
