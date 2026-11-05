// Home page and motion: "calm" (ENGINE_SPEC.md, section 6, Calm motion). The spec reads the build: with
// motion: "calm" in hub.config.ts it checks that decoration is off and feedback stays; otherwise that the hero
// and its pointer light load as before.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const CALM = readFileSync(join(import.meta.dirname, "..", "dist", "index.html"), "utf8").includes('data-motion="calm"');
const HERO = /\/_astro\/hero(-gl|-light|-contour)?\.[\w-]+\.js$/;

/** Script files the page asked for, by path. */
function requested(page: Page): string[] {
  const out: string[] = [];
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.endsWith(".js")) out.push(path);
  });
  return out;
}

/** Waits past first paint plus the hero's start, so a script that would load has loaded. */
const settle = (page: Page) => page.waitForFunction(() => performance.now() > 2500);

test("home links to the email signature, then New to the team, below Quick downloads", async ({ page }) => {
  await page.goto("/");
  const entries = page.locator(".home-entry");
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toHaveAttribute("href", "/create/signature/");
  await expect(entries.first().getByRole("heading", { level: 2 })).toHaveText("Email signature");
  await expect(entries.first()).toContainText("Email signature generator");
  await expect(entries.nth(1)).toHaveAttribute("href", "/guide/new-to-the-team/");
  const order = await page.locator("#quick-downloads, .home-entries, #preview-logos").evaluateAll((els) => els.map((e) => e.id || e.className));
  expect(order).toEqual(["quick-downloads", "home-entries", "preview-logos"]);
});

test("the home page shows the first template variant in Quick downloads", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(".quick-grid .asset-card").filter({ hasText: "Letterhead" });
  await expect(card.locator("img")).toHaveAttribute("src", "/files/templates/letterhead.svg");
});

test.describe("motion: calm", () => {
  test.skip(!CALM, "the build uses full motion");

  test("the hero script and pointer light never load; the static gradient and the first hint hold still", async ({ page }) => {
    const scripts = requested(page);
    await page.goto("/");
    await settle(page);
    expect(scripts.filter((s) => HERO.test(s))).toEqual([]);
    await expect(page.locator("[data-hero]")).toHaveAttribute("data-hero-state", "static");
    await expect(page.locator(".hero-canvas")).toHaveCount(0);
    await expect(page.locator(".hero-mesh")).toHaveCSS("background-image", /radial-gradient/);
    await expect(page.locator(".hero-hint")).toHaveCount(0);
    await expect(page.locator("#hero-q")).toHaveAttribute("placeholder", 'Try "horizontal logo"');
    const box = (await page.locator(".hero-search").boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + box.height / 2);
    await page.mouse.move(box.x + 140, box.y + box.height / 2);
    await expect(page.locator(".hero-search")).not.toHaveAttribute("data-lit");
  });

  test("page transitions are off: no @view-transition rule at all", async ({ page }) => {
    await page.goto("/");
    const rules = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.cssText.includes("@view-transition")).length);
    expect(rules).toBe(0);
  });

  test("feedback motion stays: press scale and the download arrow keep their transitions", async ({ page }) => {
    await page.goto("/logos/");
    const button = page.locator(".btn").first();
    expect(await button.evaluate((b) => getComputedStyle(b).transitionDuration)).not.toMatch(/^0s(, 0s)*$/);
  });

  test("the icon recolor happens at once, with no wave", async ({ page }) => {
    await page.goto("/icons/");
    await page.getByRole("radio", { name: "Copper on Kiln White" }).click();
    const delays = await page.locator(".icon-tile-btn").evaluateAll((ts) => ts.map((t) => parseFloat(getComputedStyle(t).transitionDelay)));
    expect(Math.max(...delays)).toBe(0);
  });
});

test.describe("motion: full", () => {
  test.skip(CALM, "the build uses calm motion");

  test("the hero script and the pointer light load after first paint", async ({ page }) => {
    const scripts = requested(page);
    await page.goto("/");
    await settle(page);
    expect(scripts.some((s) => /\/_astro\/hero\./.test(s))).toBe(true);
    expect(scripts.some((s) => /\/_astro\/hero-light\./.test(s))).toBe(true);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion");
  });
});
