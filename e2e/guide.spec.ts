// Brand guide (GuideLogo.dc.html): chapter pages in light and dark, 0.1 rule pages landing on their chapter,
// and the keyboard path through a chapter.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { routes, setTheme, THEMES } from "./routes.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const chapters = routes.filter((r) => /^\/guide\/[^/]+\/$/.test(r));
const ruleRedirects = readFileSync(join(import.meta.dirname, "..", "dist", "_redirects"), "utf8")
  .trim()
  .split("\n")
  .map((l) => l.split(" "))
  .filter(([from]) => from!.startsWith("/guide/"));

test("there is a page for every chapter", () => {
  expect(chapters).toEqual(["/guide/backgrounds/", "/guide/color-use/", "/guide/headshots/", "/guide/icons/", "/guide/logo-use/", "/guide/photography/", "/guide/templates/", "/guide/type/"]);
});

for (const theme of THEMES) {
  for (const route of chapters) {
    test(`axe ${theme} ${route}`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}

for (const [from, to] of ruleRedirects) {
  test(`${from} lands on its chapter`, async ({ page }) => {
    await page.goto(`${from}/`);
    await expect(page).toHaveURL((url) => url.pathname + url.hash === to);
    const id = to!.split("#")[1]!;
    await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
  });
}

test("a chapter: title, do and don't with their icon and word, files, and the next chapter", async ({ page }) => {
  await page.goto("/guide/logo-use/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keep clear space around the logo");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Brand guide / Logo use");
  const doList = page.getByRole("region", { name: "Do", exact: true });
  const dontList = page.getByRole("region", { name: "Don't", exact: true });
  await expect(doList.locator("h2 svg")).toHaveCount(1);
  await expect(dontList.locator("h2 svg")).toHaveCount(1);
  // Examples come from the brand's logo files.
  await expect(doList.getByRole("img")).toHaveCount(2);
  await expect(dontList.getByRole("img", { name: /stretched wide/ })).toBeVisible();
  await expect(page.getByRole("figure")).toContainText("x marks the clear space");
  await expect(page.getByRole("link", { name: "Get the logos" })).toHaveAttribute("href", "/logos/");
  await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link")).toHaveAttribute("href", "/guide/color-use/");
});

test("chapters without logos show text only", async ({ page }) => {
  await page.goto("/guide/type/");
  await expect(page.locator(".guide-chapter img")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Do", exact: true })).toBeVisible();
});

test("keyboard: from the breadcrumb, Tab reaches the files link, then the next chapter", async ({ page }) => {
  await page.goto("/guide/logo-use/");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText("Get the logos");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "/guide/color-use/");
});

test("the index lists the chapters in order with their first rule", async ({ page }) => {
  await page.goto("/guide/");
  const items = page.locator(".guide-index li");
  await expect(items.first()).toContainText("Logo use");
  await expect(items.first()).toContainText("Keep clear space around the logo");
  await expect(items).toHaveCount(8);
  await expect(page.getByRole("link", { name: "New to the team" })).toHaveCount(0);
});

test("Library rule strips link to the matching chapter", async ({ page }) => {
  const expected: Record<string, string> = {
    "/logos/": "/guide/logo-use/", "/colors/": "/guide/color-use/", "/icons/": "/guide/icons/",
    "/templates/": "/guide/templates/", "/photos/": "/guide/photography/",
  };
  for (const [route, chapter] of Object.entries(expected)) {
    await page.goto(route);
    await expect(page.locator(".rule-strip-link"), route).toHaveAttribute("href", chapter);
  }
});
