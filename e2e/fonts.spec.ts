// Fonts page (ENGINE_SPEC.md, section 5, Font groups and Font files): one section per group with its Download
// all zip, the Office install note, web files for the page's own fonts, and zips without web files.
import { unzipSync } from "fflate";
import { expect, test } from "@playwright/test";

test("one section per group, in order, with its title, help line, and families", async ({ page }) => {
  await page.goto("/fonts/");
  const sections = page.locator("section.font-group");
  await expect(sections).toHaveCount(2);
  await expect(sections.getByRole("heading", { level: 2 })).toHaveText(["Headings", "Text"]);
  await expect(sections.locator(".font-group-help")).toHaveText(["Page titles and section headings.", "Body text, interface, and small headings."]);
  await expect(sections.nth(0).getByRole("heading", { level: 3 })).toHaveText(["Fraunces"]);
  await expect(sections.nth(1).getByRole("heading", { level: 3 })).toHaveText(["Inter"]);
});

test("Download all gives each group's static and variable files, one folder per family with its license", async ({ page, request }) => {
  await page.goto("/fonts/");
  const link = page.locator("section.font-group").nth(1).getByRole("link", { name: /^Download all/ });
  await expect(link).toHaveAttribute("href", "/downloads/fonts-text.zip");
  const zip = unzipSync(new Uint8Array(await (await request.get("/downloads/fonts-text.zip")).body()));
  expect(Object.keys(zip).filter((n) => !n.endsWith("/")).sort()).toEqual([
    "Inter/Inter-Medium.ttf", "Inter/Inter-Regular.ttf", "Inter/Inter-SemiBold.ttf", "Inter/InterVariable.ttf", "Inter/OFL.txt",
  ]);
});

test("no download holds a web file", async ({ page, request }) => {
  await page.goto("/fonts/");
  const hrefs = await page.locator('a[href^="/downloads/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
  expect(hrefs.length).toBeGreaterThan(2);
  for (const href of hrefs) {
    const names = Object.keys(unzipSync(new Uint8Array(await (await request.get(href)).body())));
    expect(names.filter((n) => n.endsWith(".woff2")), href).toEqual([]);
  }
});

test("the page sets its specimens from the web files", async ({ page }) => {
  await page.goto("/fonts/");
  const sources = await page.evaluate(() =>
    [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r instanceof CSSFontFaceRule && /Inter|Fraunces/.test(r.style.getPropertyValue("font-family"))).map((r) => (r as CSSFontFaceRule).style.getPropertyValue("src")),
  );
  expect(sources).toHaveLength(2);
  for (const src of sources) expect(src).toMatch(/latin-wght-normal\.woff2/);
});

test("install steps say Office needs the TTF or OTF files", async ({ page }) => {
  await page.goto("/fonts/");
  await expect(page.locator(".font-office-note")).toHaveText("Word, PowerPoint, and Excel need the TTF or OTF files. WOFF2 files are for websites and do not install.");
});
