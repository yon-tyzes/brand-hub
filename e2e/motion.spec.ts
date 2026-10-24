// Motion and transparency fallbacks (spec section 6): reduced motion holds everything still, reduced
// transparency makes frosted surfaces solid, no WebGL leaves the static gradient, and the hero stays in budget.
import { gzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

const running = (page: Page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
const heroState = (page: Page) => page.locator("[data-hero]").getAttribute("data-hero-state");
/** Waits until the hero script has had its chance to run after first paint. */
const heroSettled = (page: Page) => page.waitForFunction(() => document.querySelector("[data-hero]")?.getAttribute("data-hero-state") !== "static" || performance.now() > 2500);

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no animation runs, the hero is still, and the hint does not type", async ({ page }) => {
    await page.goto("/");
    await heroSettled(page);
    await page.waitForTimeout(300);
    expect(["still", "static"]).toContain(await heroState(page));
    expect(await running(page)).toBe(0);
    await expect(page.locator(".hero-hint")).toHaveCount(0);
    await expect(page.locator("#hero-q")).toHaveAttribute("placeholder", 'Try "horizontal logo"');
  });

  test("filtering templates moves nothing", async ({ page }) => {
    await page.goto("/templates/");
    await page.getByRole("button", { name: "Slides", exact: true }).click();
    await page.waitForTimeout(50);
    expect(await running(page)).toBe(0);
  });
});

test("with motion on, the hero draws and the search hint types", async ({ page }) => {
  await page.goto("/");
  await heroSettled(page);
  const state = await heroState(page);
  // Machines without WebGL2 keep the static gradient; covered below.
  if (state !== "static") expect(state).toBe("moving");
  await expect(page.locator(".hero-hint")).toHaveText(/^Try "/);
  await expect(page.getByRole("searchbox", { name: "Search the brand" })).toBeVisible();
});

test("filtering templates moves items to their new place", async ({ page }) => {
  await page.goto("/templates/");
  await page.getByRole("button", { name: "Slides", exact: true }).click();
  expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
});

test("reduced transparency: frosted surfaces are solid", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await page.goto("/");
  await page.mouse.wheel(0, 500);
  await expect(page.locator("header.topbar")).toHaveAttribute("data-scrolled", "");
  await page.waitForTimeout(300);
  const surfaces = await page.evaluate(() =>
    [".hero-search", ".chip-glass", "header.topbar"].map((s) => {
      const c = getComputedStyle(document.querySelector(s)!);
      return { s, backdrop: c.backdropFilter, alpha: c.backgroundColor.startsWith("rgba") ? Number(c.backgroundColor.split(",")[3]?.replace(")", "")) : 1 };
    }),
  );
  for (const x of surfaces) {
    expect(x.backdrop, x.s).toBe("none");
    expect(x.alpha, x.s).toBe(1);
  }
});

test("frosted surfaces blur only where the spec lists them", async ({ page }) => {
  await page.goto("/");
  const frosted = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => getComputedStyle(e).backdropFilter !== "none").map((e) => e.className),
  );
  expect(frosted.every((c) => /hero-search|chip-glass/.test(c))).toBe(true);
  await page.mouse.wheel(0, 500);
  await expect(page.locator("header.topbar")).toHaveCSS("backdrop-filter", "blur(14px) saturate(1.4)");
});

test("without WebGL the static gradient shows and search works", async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === "webgl2" ? null : (get as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof get;
  });
  await page.goto("/");
  await page.waitForTimeout(800);
  expect(await heroState(page)).toBe("static");
  await expect(page.locator(".hero-canvas")).toHaveCount(0);
  await expect(page.locator(".hero-mesh")).toHaveCSS("background-image", /radial-gradient/);
  await page.getByRole("searchbox", { name: "Search the brand" }).pressSequentially("ink");
  await expect(page.getByRole("dialog", { name: "Search the brand" })).toBeVisible();
});

test("the hero script stays under 12 KB gzipped and loads after first paint", async ({ page }) => {
  const hero: { url: string; gzip: number; at: number }[] = [];
  page.on("response", async (res) => {
    if (!/\/_astro\/hero[^/]*\.js$/.test(new URL(res.url()).pathname)) return;
    const body = await res.body().catch(() => null);
    if (body) hero.push({ url: res.url(), gzip: gzipSync(body, { level: 9 }).length, at: Date.now() });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0);
  expect(hero.length).toBeGreaterThan(0);
  expect(hero.reduce((s, f) => s + f.gzip, 0)).toBeLessThan(12 * 1024);
  const heroStart = await page.evaluate(() => Math.min(...performance.getEntriesByType("resource").filter((r) => /\/hero[^/]*\.js$/.test(r.name)).map((r) => r.startTime)));
  expect(heroStart).toBeGreaterThan(fcp);
});
