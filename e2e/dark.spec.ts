// Dark theme checks for brand content: logo previews keep the ground their logo was made for, and the Icons
// page opens on a pair that reads in dark.
import { expect, test, type Locator, type Page } from "@playwright/test";
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

  test("the Icons page opens on a dark-ground pair whose icons reach 3:1 against the panel", async ({ page }) => {
    await page.goto("/icons/");
    await expect(page.getByRole("radio", { name: "Kiln White on Ink" })).toHaveAttribute("aria-checked", "true");
    const [icon, ground] = await colorsOf(page);
    expect(contrast(icon, ground)).toBeGreaterThanOrEqual(3);
    // The detail panel previews the icon on the same ground.
    expect(await page.locator("[data-icon-preview]").evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(`rgb(${ground.join(", ")})`);
  });
});

/** The first icon tile's color and the board's ground, as RGB. */
async function colorsOf(page: Page): Promise<[number[], number[]]> {
  return page.evaluate(() => {
    const rgb = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    return [rgb(getComputedStyle(document.querySelector(".icon-tile-btn")!).color), rgb(getComputedStyle(document.querySelector(".icon-board")!).backgroundColor)];
  });
}

function contrast(a: number[], b: number[]) {
  const lum = (c: number[]) => {
    const [r, g, bl] = c.map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

test("light theme opens on a light-ground pair, and a picked pair is kept for later visits", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/icons/");
  await expect(page.getByRole("radio", { name: "Ink on Kiln White" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Kiln White on Comet Green" }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Kiln White on Comet Green" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".icon-board")).toHaveCSS("background-color", "rgb(30, 91, 74)");
  // The pick holds across the theme toggle.
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.getByRole("radio", { name: "Kiln White on Comet Green" })).toHaveAttribute("aria-checked", "true");
});

test("without a pick, the pair follows the theme toggle", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/icons/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.getByRole("radio", { name: "Kiln White on Ink" })).toHaveAttribute("aria-checked", "true");
});

test("the Icons page works when storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/icons/");
  await page.getByRole("radio", { name: "Copper on Kiln White" }).click();
  await expect(page.getByRole("radio", { name: "Copper on Kiln White" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".icon-tile-btn").first()).toHaveCSS("color", "rgb(154, 74, 36)");
  expect(errors).toEqual([]);
});
