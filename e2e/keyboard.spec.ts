// Keyboard-only run: open search, find an icon, change its color, download it; download a logo and a template.
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

test("keyboard only: search, recolor and download an icon, download a logo and a template", async ({ page }) => {
  // Search for an icon and open it.
  await page.goto("/");
  await page.keyboard.press("/");
  const search = page.getByRole("dialog", { name: "Search the brand" }).getByRole("searchbox");
  await expect(search).toBeFocused();
  await page.keyboard.type("hot cup");
  const dialog = page.getByRole("dialog", { name: "Search the brand" });
  await expect(dialog.getByRole("button", { name: /^Hot cup/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(":focus")).toContainText("Hot cup");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/icons\/?#icon-cup-hot$/);
  const panel = page.getByRole("complementary", { name: "Selected icon" });
  await expect(panel.getByRole("heading", { name: "Hot cup" })).toBeVisible();

  // Change the color with the arrow keys in the radio group.
  await tabTo(page, /^Ink$/);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Comet Green" })).toHaveAttribute("aria-checked", "true");
  await expect(panel).toContainText("Tea · Comet Green");

  // Download the recolored SVG and see it confirmed.
  await tabTo(page, /^For print and slides/);
  const svg = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await svg).suggestedFilename()).toBe("cup-hot-comet-green.svg");

  // Download a logo, named by use.
  await page.goto("/logos/");
  await tabTo(page, /^For print and web.*Horizontal logo$/);
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("pocket-comet-horizontal-full-color.svg");
  await expect(page.locator("[data-toast-region]")).toHaveText("pocket-comet-horizontal-full-color.svg downloaded");

  // Download a template. The demo templates offer a PDF only.
  await page.goto("/templates/");
  await tabTo(page, /^PDF: Letterhead$/);
  const pdf = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await pdf).suggestedFilename()).toBe("letterhead.pdf");
});
