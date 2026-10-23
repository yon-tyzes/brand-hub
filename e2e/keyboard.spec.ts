// Keyboard-only run: open search, find an icon, change its color, copy SVG, close; download a logo; open a template.
import { expect, test, type Page } from "@playwright/test";

/** Presses Tab until the focused element's accessible label matches, and fails after 60 presses. */
async function tabTo(page: Page, name: RegExp) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const labelled = el.getAttribute("aria-labelledby");
      const byId = labelled ? document.getElementById(labelled)?.textContent : null;
      const wrap = el.closest("label")?.textContent;
      return (el.getAttribute("aria-label") ?? byId ?? wrap ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    if (name.test(label)) return label;
  }
  throw new Error(`Tab never reached ${name}`);
}

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("keyboard only: search, recolor and copy an icon, download a logo, open a template", async ({ page, context }) => {
  await context.route("https://example.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<title>Template</title>" }));

  // Search for an icon and open it.
  await page.goto("/");
  await page.keyboard.press("/");
  const search = page.getByRole("searchbox", { name: "Search assets and rules" });
  await expect(search).toBeFocused();
  await page.keyboard.type("hot cup");
  await expect(page.getByRole("button", { name: /^Hot cup/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toContainText("Hot cup");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/icons\/?#icon-cup-hot$/);
  const sheet = page.getByRole("dialog", { name: "Hot cup" });
  await expect(sheet).toBeVisible();

  // Change the color with the arrow keys in the radio group.
  await tabTo(page, /^Ink$/);
  await page.keyboard.press("ArrowRight");
  await expect(sheet.getByRole("radio", { name: "Comet Green" })).toBeChecked();

  // Copy the recolored SVG.
  await tabTo(page, /^Copy SVG$/);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-toast-region]")).toHaveText("Hot cup icon SVG in Comet Green copied.");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('fill="#1E5B4A"');
  expect(clip).toMatch(/^<svg/);

  // Close returns focus to the icon that opened it.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // Download a logo.
  await page.goto("/logos/");
  await tabTo(page, /^Download SVG: Horizontal logo$/);
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("pocket-comet-horizontal-full-color.svg");

  // Open a template in a new tab.
  await page.goto("/templates/");
  await tabTo(page, /^Open template: Letterhead/);
  // Demo templates open a page on the same site that says they are demo entries.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/demo-template\/#letterhead$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This is a demo template entry");
});
