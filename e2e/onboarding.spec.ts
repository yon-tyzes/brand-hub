// New to the team and the Office theme (ENGINE_SPEC.md, sections 7 and 14), on the demo brand: the home entry,
// the numbered steps whose links all resolve, the theme download on /office, /colors, and /fonts, and search.
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "@playwright/test";

const THEME = "/downloads/pocket-comet-office-theme.thmx";

test("home links to New to the team once, below Quick downloads", async ({ page }) => {
  await page.goto("/");
  const entry = page.locator(".start-entry");
  await expect(entry).toHaveCount(1);
  await expect(entry).toHaveAttribute("href", "/guide/new-to-the-team/");
  const order = await page.locator("#quick-downloads, .start-entry, #preview-logos").evaluateAll((els) => els.map((e) => e.id || e.className));
  expect(order).toEqual(["quick-downloads", "start-entry", "preview-logos"]);
});

test("the steps are numbered in order, and every link opens a page on the site", async ({ page, request }) => {
  await page.goto("/guide/new-to-the-team/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New to the team");
  const steps = page.locator(".start-step");
  await expect(steps.locator(".start-step-number")).toHaveText(["1", "2", "3", "4"]);
  await expect(steps.getByRole("heading", { level: 2 })).toHaveText([
    "Step 1: Set up your email signature", "Step 2: Install the brand fonts", "Step 3: Add the Office theme", "Step 4: Find the logo for your file",
  ]);
  await expect(steps.nth(0).getByRole("link")).toHaveText(["Email signature"]);
  await expect(steps.nth(1).getByRole("link")).toHaveText(["Fonts", "Fraunces"]);
  await expect(steps.nth(2).getByRole("link")).toHaveText(["Office theme"]);
  const hrefs = await steps.getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs).toEqual(["/create/signature/", "/fonts/", "/fonts#fraunces", "/office/", "/logos/", "/logos#logo-horizontal"]);
  for (const href of hrefs) {
    const [path, hash] = href.split("#");
    const res = await request.get(path!.endsWith("/") ? path! : `${path}/`);
    expect(res.status(), href).toBe(200);
    if (hash) expect(await res.text(), href).toContain(`id="${hash}"`);
  }
});

test("the Office theme page shows the twelve slots, both fonts, and a download that unzips", async ({ page, request }) => {
  await page.goto("/office/");
  await expect(page.locator(".swatch-tile-name")).toHaveText([
    "Dark 1", "Light 1", "Dark 2", "Light 2", "Accent 1", "Accent 2", "Accent 3", "Accent 4", "Accent 5", "Accent 6", "Hyperlink", "Followed hyperlink",
  ]);
  await expect(page.locator(".office-font .caption")).toHaveText(["Headings: Fraunces", "Body: Inter"]);
  await expect(page.getByRole("link", { name: "brand fonts" })).toHaveAttribute("href", "/fonts/");
  const download = page.getByRole("link", { name: /^Download Office theme/ });
  await expect(download).toHaveAttribute("href", THEME);
  await expect(page.locator(".library-head .office-download .caption")).toHaveText("Updated Oct 23, 2026 · 3 KB");
  const files = unzipSync(new Uint8Array(await (await request.get(THEME)).body()));
  const theme = strFromU8(files["theme/theme/theme1.xml"]!);
  expect(theme).toContain('<a:dk1><a:srgbClr val="1C2430"/></a:dk1>');
  expect(theme).toContain('<a:majorFont><a:latin typeface="Fraunces"/>');
});

test("Colors and Fonts end with the Office theme download and how to apply it", async ({ page }) => {
  for (const path of ["/colors/", "/fonts/"]) {
    await page.goto(path);
    const card = page.locator("section", { has: page.locator("#office-theme") });
    await expect(card.getByRole("link", { name: /^Download Office theme/ }), path).toHaveAttribute("href", THEME);
    await expect(card.locator(".office-card-text p"), path).toHaveText([/^Windows: .*Browse for Themes/, /^Mac: .*Browse Themes/]);
    await expect(card.getByRole("link", { name: "Install steps" })).toHaveAttribute("href", "/office/#install");
  }
});

test("search finds New to the team and the Office theme", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("/");
  const box = page.getByRole("dialog", { name: "Search the brand" }).getByRole("searchbox");
  await box.fill("new to the team");
  await expect(page.locator(".search-result", { hasText: "New to the team" }).first()).toBeVisible();
  await box.fill("powerpoint");
  await expect(page.locator(".search-result", { hasText: "Office theme" }).first()).toBeVisible();
});
