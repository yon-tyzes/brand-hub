// axe on every route in both themes, and no horizontal scroll at 320, 390, 768, and 1440, and at 200% zoom
// (a 1280px window at 200% zoom lays out at 640 CSS pixels).
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes, setTheme, THEMES } from "./routes.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const theme of THEMES) {
  for (const route of routes) {
    test(`axe ${theme} ${route}`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(route);
      // The editor renders in the browser; check it once it has loaded.
      if (route === "/admin/") await page.locator(".admin-cards").waitFor();
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary).toEqual([]);
    });
  }
}

const WIDTHS = [
  { width: 320, name: "320px" },
  { width: 390, name: "390px" },
  { width: 640, name: "200% zoom on a 1280px window" },
  { width: 768, name: "768px" },
  { width: 1440, name: "1440px" },
];

for (const { width, name } of WIDTHS) {
  test(`no horizontal scroll at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const wide: string[] = [];
    for (const route of routes) {
      await page.goto(route);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) wide.push(`${route} (+${over}px)`);
    }
    expect(wide).toEqual([]);
  });
}

/** Waits for open and fade animations to end, so axe measures final colors. */
const settled = (page: import("@playwright/test").Page) =>
  page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));

test("open dialogs pass axe", async ({ page }) => {
  await page.goto("/icons/");
  await page.getByRole("button", { name: "Hot cup" }).first().click();
  await expect(page.getByRole("dialog", { name: "Hot cup" })).toBeVisible();
  await settled(page);
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.keyboard.press("/");
  await page.getByRole("searchbox", { name: "Search assets and rules" }).fill("green");
  await expect(page.getByRole("button", { name: /Comet Green/ }).first()).toBeVisible();
  await settled(page);
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
});
