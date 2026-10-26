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
  // Machines without WebGL2 keep the static gradient (covered below); with WebGL2 the mesh must run.
  const gl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));
  if (gl) {
    expect(state).toBe("moving");
    // The canvas paints over the static gradient: it is what sits under the hero's center.
    const top = await page.evaluate(() => {
      const r = document.querySelector(".hero")!.getBoundingClientRect();
      const title = document.querySelector<HTMLElement>(".hero-content")!;
      title.style.visibility = "hidden";
      const el = document.elementFromPoint(r.right - 40, r.top + 40);
      title.style.visibility = "";
      return el?.className;
    });
    expect(top).toContain("hero-canvas");
  }
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

for (const width of [1440, 390]) {
  test(`light theme at ${width}px: the hero search field and every chip have an edge over the gradient`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const looks = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".hero-search, .hero-chips .chip")].map((e) => {
        const c = getComputedStyle(e);
        return { name: e.textContent?.trim(), border: c.borderTopColor, width: c.borderTopWidth, shadow: c.boxShadow, backdrop: c.backdropFilter };
      }),
    );
    expect(looks.length).toBe(5);
    for (const l of looks) {
      expect(l.border, l.name).toBe("rgba(11, 13, 16, 0.09)");
      expect(l.width, l.name).toBe("1px");
      expect(l.shadow, l.name).toContain("inset");
      expect(l.backdrop, l.name).toBe("blur(14px) saturate(1.8)");
    }
  });
}

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
  // The hero loads after first paint, so it can arrive after the network first goes quiet.
  await page.waitForFunction(() => performance.getEntriesByType("resource").some((r) => /\/hero[^/]*\.js$/.test(r.name)));
  await expect.poll(() => hero.length).toBeGreaterThan(0);
  const fcp = await page.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0);
  expect(hero.length).toBeGreaterThan(0);
  expect(hero.reduce((s, f) => s + f.gzip, 0)).toBeLessThan(12 * 1024);
  const heroStart = await page.evaluate(() => Math.min(...performance.getEntriesByType("resource").filter((r) => /\/hero[^/]*\.js$/.test(r.name)).map((r) => r.startTime)));
  expect(heroStart).toBeGreaterThan(fcp);
});

const lightOpacity = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector(".hero-search")!, "::before").opacity || 0));

test("the pointer light follows a mouse over the hero search field and fades out on leave", async ({ page }) => {
  await page.goto("/");
  await heroSettled(page);
  const box = (await page.locator(".hero-search").boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + box.height / 2);
  await page.mouse.move(box.x + 140, box.y + box.height / 2);
  await expect(page.locator(".hero-search")).toHaveAttribute("data-lit", "");
  await expect.poll(() => lightOpacity(page)).toBe(1);
  expect(await page.locator(".hero-search").evaluate((e) => e.style.getPropertyValue("--light-x"))).toBe("140px");
  await page.mouse.move(box.x + 100, box.y + box.height + 120);
  await expect(page.locator(".hero-search")).not.toHaveAttribute("data-lit");
  await expect.poll(() => lightOpacity(page)).toBe(0);
});

test.describe("touch", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("the pointer light never shows", async ({ page }) => {
    await page.goto("/");
    await heroSettled(page);
    const box = (await page.locator(".hero-search").boundingBox())!;
    await page.touchscreen.tap(box.x + 60, box.y + box.height / 2);
    await page.locator(".hero-search").dispatchEvent("pointermove", { pointerType: "touch", clientX: box.x + 60, clientY: box.y + 20 });
    await page.waitForTimeout(250);
    await expect(page.locator(".hero-search")).not.toHaveAttribute("data-lit");
    expect(await page.evaluate(() => getComputedStyle(document.querySelector(".hero-search")!, "::before").content)).toBe("none");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the pointer light is off", async ({ page }) => {
    await page.goto("/");
    await heroSettled(page);
    const box = (await page.locator(".hero-search").boundingBox())!;
    await page.mouse.move(box.x + 100, box.y + box.height / 2);
    await page.mouse.move(box.x + 140, box.y + box.height / 2);
    await page.waitForTimeout(250);
    await expect(page.locator(".hero-search")).not.toHaveAttribute("data-lit");
    expect(await lightOpacity(page)).toBe(0);
  });
});

test("changing the icon pair recolors the tiles in a wave of at most 400ms", async ({ page }) => {
  await page.goto("/icons/");
  await page.getByRole("radio", { name: "Copper on Kiln White" }).click();
  const waves = await page.locator(".icon-tile-btn").evaluateAll((tiles) => tiles.map((t) => parseFloat(getComputedStyle(t).transitionDelay)));
  expect(waves.slice(0, 4)).toEqual([0, 0.02, 0.04, 0.06]);
  expect(Math.max(...waves)).toBeLessThanOrEqual(0.28);
  expect(await page.locator(".icon-board").evaluate((e) => getComputedStyle(e).transitionDuration)).toContain("0.32s");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the icon recolor is instant", async ({ page }) => {
    await page.goto("/icons/");
    await page.getByRole("radio", { name: "Copper on Kiln White" }).click();
    const last = page.locator(".icon-tile-btn").last();
    expect(await last.evaluate((t) => getComputedStyle(t).transitionDelay.split(", ").every((d) => parseFloat(d) === 0))).toBe(true);
    await expect(last).toHaveCSS("color", "rgb(154, 74, 36)");
  });
});

test.describe("copy", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("a copied color row flashes the success tint and fades back", async ({ page }) => {
    await page.goto("/colors/");
    const row = page.locator(".value-row").first();
    await row.click();
    await expect(page.locator("[data-toast-region]")).toContainText("copied");
    expect(await row.evaluate((e) => e.getAnimations().map((a) => (a as CSSAnimation).animationName))).toContain("copy-flash");
    await expect(row).not.toHaveClass(/is-flashing/);
  });

  test("copying from search keeps the dialog open, flashes the row, and shows a check for 1.2 seconds", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    const dialog = page.getByRole("dialog", { name: "Search the brand" });
    await dialog.getByRole("searchbox").fill("comet green");
    const copy = dialog.getByRole("button", { name: /^Copy .*: Comet Green$/ }).first();
    await copy.click();
    await expect(dialog).toBeVisible();
    await expect(copy).toHaveAttribute("data-copied", "");
    await expect(dialog.getByRole("status")).toHaveText(/Comet Green #1E5B4A copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("#1E5B4A");
    await expect(copy).not.toHaveAttribute("data-copied", { timeout: 2000 });
  });
});

test("the download arrow dips on hover and drops out and back on click", async ({ page }) => {
  await page.goto("/logos/");
  const button = page.locator("#logo-horizontal .btn-primary");
  const arrow = button.locator(".icon-arrow");
  await button.hover();
  await expect.poll(() => arrow.evaluate((e) => getComputedStyle(e).transform)).toBe("matrix(1, 0, 0, 1, 0, 3)");
  const download = page.waitForEvent("download");
  await button.click();
  expect(await arrow.evaluate((e) => e.getAnimations().map((a) => (a as CSSAnimation).animationName))).toContain("arrow-drop");
  await download;
  await expect(arrow).not.toHaveClass(/is-dropping/);
});

test("hovered cards: a color preview grows 10px without moving the card's text, other previews scale to 1.02", async ({ page }) => {
  await page.goto("/");
  const color = page.locator(".quick-color").first();
  // The title's place inside the card, and the card's height: neither changes.
  const layout = () => color.evaluate((card) => ({ title: card.querySelector(".asset-title")!.getBoundingClientRect().top - card.getBoundingClientRect().top, height: card.getBoundingClientRect().height }));
  const before = await layout();
  await color.hover();
  await expect.poll(() => color.locator(".asset-well").evaluate((e) => e.getBoundingClientRect().height)).toBe(160);
  expect(await layout()).toEqual(before);
  await expect.poll(() => color.evaluate((e) => getComputedStyle(e).transform)).toBe("matrix(1, 0, 0, 1, 0, -2)");
  const logo = page.locator(".quick-grid .asset-card", { has: page.locator(".asset-well > img") }).first();
  await logo.hover();
  await expect.poll(() => logo.locator(".asset-well > img").evaluate((e) => getComputedStyle(e).transform)).toBe("matrix(1.02, 0, 0, 1.02, 0, 0)");
});
