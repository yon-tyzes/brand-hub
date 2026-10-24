// The 0.2 editor (EditorHome.dc.html, EditorColors.dc.html): Overview, the module workspace with Edited
// marks and the change count, statuses with their help text, Brand settings, and axe with an item open.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { setTheme, THEMES } from "./routes.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const details = (page: import("@playwright/test").Page) => page.getByRole("complementary", { name: "Details" });

test("the Overview loads with live counts, add tiles, decisions, and recent changes", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page.getByText(/\d+ items are live on the site\. Last published [A-Z][a-z]{2} \d+ by /)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add a color/ })).toHaveAttribute("href", "/admin/colors/");
  await expect(page.getByRole("heading", { name: "Ready to publish" })).toBeVisible();
  await expect(page.getByText("Steam is pending")).toBeVisible();
  // The pending icon shows its own glyph, not the section icon.
  await expect(page.getByRole("region", { name: "Waiting on a decision" }).locator(".ov-thumb-icon[style] svg")).toHaveCount(1);
  await expect(page.locator(".ov-log li")).toHaveCount(6);
  await expect(page.getByRole("navigation", { name: "Editor" }).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
});

test("a color edit marks the card Edited, updates the count, and is ready to publish", async ({ page }) => {
  await page.goto("/admin/colors/");
  await expect(page.getByText("7 colors")).toBeVisible();
  const card = page.locator('.admin-card[data-id="comet-green"]');
  await expect(card).not.toContainText("Edited");
  await page.getByRole("button", { name: "Edit Comet Green" }).click();
  await details(page).getByLabel("Web (HEX)").fill("#1E5B4B");
  await expect(card).toContainText("#1E5B4B");
  await expect(card).toContainText("Edited");
  await expect(page.getByRole("button", { name: /1 unsaved change/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Editor" }).getByRole("link", { name: "Overview" }).click();
  const ready = page.getByRole("region", { name: "Ready to publish" });
  await expect(ready).toContainText("Comet Green");
  await expect(ready.getByRole("button", { name: "Publish 1 change" })).toBeVisible();
  await ready.getByRole("button", { name: "Review Comet Green" }).click();
  await expect(page).toHaveURL(/\/admin\/colors\/$/);
  await expect(details(page).getByLabel("Name", { exact: true })).toHaveValue("Comet Green");
});

test("each status shows its help text", async ({ page }) => {
  await page.goto("/admin/colors/");
  await page.getByRole("button", { name: "Edit Mist" }).click();
  const status = details(page).getByRole("radiogroup", { name: "Status" });
  const help = details(page).locator(".ed-status-help");
  await expect(status.getByRole("radio")).toHaveCount(4);
  for (const [label, text] of [
    ["Live", "On the site after you publish."],
    ["Pending", "Not on the site yet. Waiting for approval."],
    ["Draft", "Only in the editor."],
    ["Retired", "It leaves the site when you publish. You can restore it later."],
  ]) {
    await status.getByRole("radio", { name: label }).check();
    await expect(help).toHaveText(text!);
  }
  await expect(page.locator('.admin-card[data-id="mist"] .status-badge')).toHaveText("Retired");
});

test("templates and rules use the 0.2 fields", async ({ page }) => {
  await page.goto("/admin/templates/");
  await page.getByRole("button", { name: "Edit Letterhead" }).click();
  const formats = details(page).getByRole("group", { name: "Formats" });
  await expect(formats.locator("strong", { hasText: /^Word$/ })).toBeVisible();
  await expect(formats.getByText("letterhead.pdf")).toBeVisible();
  await formats.getByRole("button", { name: "Remove PDF" }).click();
  await expect(details(page).getByText("Add a Canva link or at least one file.")).toBeVisible();

  await page.getByRole("navigation", { name: "Editor" }).getByRole("link", { name: /^Rules/ }).click();
  await page.getByRole("button", { name: "Edit Logo clear space" }).click();
  const chapter = details(page).getByLabel("Chapter");
  await expect(chapter).toHaveValue("logo-use");
  await expect(chapter.locator("option")).toHaveCount(8);
});

test("brand settings show the tuned hero tones and join the change list", async ({ page }) => {
  await page.goto("/admin/settings/");
  const preview = page.getByRole("group", { name: "Home gradient preview" });
  await expect(preview).toContainText("#c2dfd4");
  await page.getByLabel("Web (HEX)").fill("#9A4A24");
  await expect(preview).not.toContainText("#c2dfd4");
  await page.getByRole("button", { name: /unsaved change/ }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toContainText("Brand settings: primary color changed");
});

test("back and forward move between editor views", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByRole("navigation", { name: "Editor" }).getByRole("link", { name: /^Logos/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Logos" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/admin\/logos\/$/);
});

for (const theme of THEMES) {
  test(`axe ${theme}: Overview and a module view with an item open`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/admin/");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    await page.goto("/admin/colors/");
    await page.getByRole("button", { name: "Edit Comet Green" }).click();
    await expect(details(page).getByLabel("Name", { exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    await page.goto("/admin/settings/");
    await expect(page.getByRole("heading", { level: 1, name: "Brand settings" })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations.map((v) => v.id)).toEqual([]);
  });
}
