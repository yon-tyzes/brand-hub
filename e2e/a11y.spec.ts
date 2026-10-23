// axe on every route in both themes, and no horizontal scroll at 390, 768, and 1440.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes, setTheme, THEMES } from "./routes.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const theme of THEMES) {
  for (const route of routes) {
    test(`axe ${theme} ${route}`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary).toEqual([]);
    });
  }
}

for (const width of [390, 768, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
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

test("open dialogs and menus pass axe", async ({ page }) => {
  await page.goto("/icons/");
  await page.getByRole("button", { name: "Teapot" }).first().click();
  await expect(page.getByRole("dialog", { name: "Teapot" })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.keyboard.press("/");
  await page.getByRole("searchbox", { name: "Search assets and rules" }).fill("green");
  await expect(page.getByRole("button", { name: /Comet Green/ }).first()).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Modules" }).click();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
});
