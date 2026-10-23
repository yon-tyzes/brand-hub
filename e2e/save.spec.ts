// Saving through the demo adapter on the static production build (no server): save, publish, history,
// restore, problems that block a save, and the full-page preview.
import { expect, test, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/admin/");
  await expect(page.getByRole("list", { name: "Logos" })).toBeVisible();
}

const details = (page: Page) => page.getByRole("complementary", { name: "Details" });
const count = (page: Page) => page.locator(".count-dot");

async function rename(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: `Edit ${from}`, exact: true }).click();
  await details(page).getByLabel("Name", { exact: true }).fill(to);
  await expect(page.getByRole("button", { name: `Edit ${to}`, exact: true })).toBeVisible();
}

test("demo mode says changes are not saved", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("region", { name: "Demo mode" })).toHaveText("Demo mode: changes are not saved.");
});

test("save a draft, publish it, and see both in history", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await rename(page, "Logo mark", "Comet mark");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();
  await expect(count(page)).toHaveText("0");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Published in this demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("dialog", { name: "History" });
  await expect(history).toContainText('Logo, Comet mark: renamed from "Logo mark"');
  await expect(history).toContainText("Published");
});

test("restore an earlier version as a new draft", async ({ page }) => {
  await open(page);
  await rename(page, "Logo mark", "First name");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();
  await rename(page, "First name", "Second name");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("dialog", { name: "History" });
  await history.getByRole("listitem").filter({ hasText: "renamed from \"Logo mark\"" }).getByRole("button", { name: /^Restore/ }).click();
  await expect(page.getByRole("button", { name: "Edit First name", exact: true })).toBeVisible();
  await expect(count(page)).toHaveText("1");
});

test("problems block the save and point to the items to fix", async ({ page }) => {
  await open(page);
  await page.locator(".rail-item", { hasText: "Rules" }).click();
  await page.getByRole("button", { name: "Edit Logo clear space" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.getByRole("dialog", { name: /Delete Logo clear space/ }).getByRole("button", { name: "Delete Logo clear space" }).click();

  await page.getByRole("button", { name: "Save draft" }).click();
  const problems = page.getByRole("dialog", { name: "Fix these before saving" });
  await expect(problems).toContainText("Logo: Horizontal logo");
  await expect(problems).toContainText("Rules that apply includes Logo clear space, which was deleted. Remove it there.");
  await expect(problems).toContainText("Template: Letterhead");
  await problems.getByRole("button", { name: "Show Horizontal logo", exact: true }).click();

  await expect(details(page).getByRole("alert")).toContainText("Rules that apply includes Logo clear space");
  await expect(page.locator('.admin-card[data-id="logo-horizontal"] .status-attention')).toBeVisible();
  // Nothing was saved.
  await expect(count(page)).toHaveText("1");
});

test("preview draws public pages from the draft, marked as not live", async ({ page }) => {
  await open(page);
  await rename(page, "Horizontal logo", "Main logo");
  await page.getByRole("button", { name: "Preview" }).click();
  const panel = page.getByRole("dialog", { name: "Preview, not live" });
  await expect(panel).toBeVisible();

  const frame = page.frameLocator("iframe.preview-frame");
  await expect(frame.getByRole("heading", { level: 1, name: "Logos" })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 2, name: "Main logo" })).toBeVisible();
  await expect(frame.getByRole("heading", { level: 2, name: "Horizontal logo", exact: true })).toHaveCount(0);

  await panel.getByLabel("Page").selectOption({ label: "Colors" });
  await expect(frame.getByRole("heading", { level: 1, name: "Colors" })).toBeVisible();

  // Links inside the preview switch the preview page.
  await frame.getByRole("link", { name: "All files", exact: true }).first().click();
  await expect(panel.getByLabel("Page")).toHaveValue("home");
  await expect(frame.getByRole("heading", { level: 1, name: /Pocket Comet\s*brand files/ })).toBeVisible();
});

test("an uploaded logo saves and keeps showing under its uploaded name", async ({ page }) => {
  await open(page);
  const dt = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'], "My new mark.svg", { type: "image/svg+xml" }));
    return d;
  });
  await page.dispatchEvent(".admin-grid-panel", "dragover", { dataTransfer: dt });
  await page.dispatchEvent(".admin-grid-panel", "drop", { dataTransfer: dt });
  await details(page).getByLabel("Layout").fill("Mark");
  await details(page).getByLabel("Color version").fill("One color");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();
  // The editor keeps showing the name she uploaded; the final file name (tests/serializer.test.ts) stays out of view.
  await expect(details(page).locator(".ed-files")).toContainText("My new mark.svg");
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("dialog", { name: "History" })).toContainText("Logo, My new mark: added");
});
