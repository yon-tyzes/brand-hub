// The local adapter on `astro dev`: edits write the brand files on disk, a build shows them, a change made
// outside the editor is caught as a conflict, and history comes from git.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "astro";
import { expect, test, type Page } from "@playwright/test";

const root = () => readFileSync(join(import.meta.dirname, ".root"), "utf8").trim();
const brandFile = (name: string) => join(root(), "brands", "demo", name);
const details = (page: Page) => page.getByRole("complementary", { name: "Details" });

async function open(page: Page) {
  await page.goto("/admin/logos/");
  await expect(page.getByRole("list", { name: "Logos" })).toBeVisible({ timeout: 60_000 });
}

async function renameAndSave(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: `Edit ${from}`, exact: true }).click();
  await details(page).getByLabel("Name", { exact: true }).fill(to);
  await page.getByRole("button", { name: "Save draft" }).click();
}

test.describe.configure({ mode: "serial" });

test("saving writes stable brand files, and a build shows the change", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("region", { name: "Demo mode" })).toHaveCount(0);
  await renameAndSave(page, "Logo mark", "Comet mark");
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible();

  const text = readFileSync(brandFile("logos.json"), "utf8");
  const logos = JSON.parse(text) as { id: string; label: string; updated: string; audience: string }[];
  const mark = logos.find((l) => l.id === "logo-mark")!;
  expect(mark.label).toBe("Comet mark");
  expect(mark.updated).toBe(new Date().toLocaleDateString("en-CA"));
  // Stable JSON: sorted keys, two-space indent, trailing newline.
  expect(text.endsWith("}\n]\n")).toBe(true);
  expect(Object.keys(mark)).toEqual([...Object.keys(mark)].sort());
  const changelog = JSON.parse(readFileSync(brandFile("changelog.json"), "utf8")) as { assetId: string; summary: string }[];
  expect(changelog).toContainEqual(expect.objectContaining({ assetId: "logo-mark", summary: 'Comet mark: renamed from "Logo mark"' }));

  await build({ root: root(), logLevel: "error" });
  const html = readFileSync(join(root(), "dist", "logos", "index.html"), "utf8");
  expect(html).toContain("Comet mark");
  expect(html).not.toContain(">Logo mark<");
});

test("a change made outside the editor reloads it with unsaved edits kept on top", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit Stacked logo", exact: true }).click();
  await details(page).getByLabel("Name", { exact: true }).fill("Stacked, mine");
  await page.waitForTimeout(800); // autosave

  // Someone edits the colors file by hand; the dev server reloads the editor.
  const reloaded = page.waitForEvent("framenavigated", { predicate: (f) => f === page.mainFrame() });
  const colors = JSON.parse(readFileSync(brandFile("colors.json"), "utf8")) as { id: string; label: string }[];
  colors.find((c) => c.id === "copper")!.label = "Copper, theirs";
  writeFileSync(brandFile("colors.json"), JSON.stringify(colors, null, 2) + "\n");
  await reloaded;

  await expect(page.getByRole("status").filter({ hasText: "Your unsaved changes are kept on top" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Edit Stacked, mine", exact: true })).toBeVisible();
  // The save rewrites watched brand files, so the dev server restarts and reloads the editor. Wait for that
  // here, or the next test's first request can land mid-restart.
  const reloadedAfterSave = page.waitForEvent("framenavigated", { predicate: (f) => f === page.mainFrame() });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible({ timeout: 30_000 });
  await reloadedAfterSave;
  await expect(page.getByRole("list", { name: "Logos" })).toBeVisible({ timeout: 60_000 });
  const logos = JSON.parse(readFileSync(brandFile("logos.json"), "utf8")) as { id: string; label: string }[];
  const after = JSON.parse(readFileSync(brandFile("colors.json"), "utf8")) as { id: string; label: string }[];
  expect(logos.find((l) => l.id === "logo-stacked")!.label).toBe("Stacked, mine");
  expect(after.find((c) => c.id === "copper")!.label).toBe("Copper, theirs");
});

test("a save against a newer version shows what changed and can overwrite", async ({ page }) => {
  await open(page);
  // The server answers the next save the way it does when the base moved: 409 with the newer content.
  const remote = await (await page.request.get("/admin/api/local/draft")).json();
  remote.revision = "someone-else";
  remote.data.records.find((r: { id: string }) => r.id === "ink").label = "Ink, theirs";
  let first = true;
  await page.route("**/admin/api/local/save", (route) => {
    if (!first) return route.continue();
    first = false;
    return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify(remote) });
  });

  await page.getByRole("button", { name: "Edit Horizontal logo, reversed", exact: true }).click();
  await details(page).getByLabel("Name", { exact: true }).fill("Reversed, mine");
  await page.getByRole("button", { name: "Save draft" }).click();
  const conflict = page.getByRole("dialog", { name: "Someone else changed the brand" });
  await expect(conflict).toContainText('Color, Ink, theirs: renamed from "Ink"');
  await conflict.getByRole("button", { name: "Get their changes" }).click();
  await expect(page.getByRole("button", { name: "Edit Reversed, mine", exact: true })).toBeVisible();
  await page.locator(".ed-side-item", { hasText: "Colors" }).click();
  await expect(page.getByRole("button", { name: "Edit Ink, theirs", exact: true })).toBeVisible();
});

test("history lists git commits and restores one as a draft", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("dialog", { name: "History" });
  await expect(history).toContainText("Demo brand as committed");
  // Restore the committed version over the edits the earlier tests saved.
  await history.getByRole("listitem").filter({ hasText: "Demo brand as committed" }).getByRole("button", { name: /^Restore/ }).click();
  await expect(page.getByRole("button", { name: "Edit Logo mark", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /unsaved change/ }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toContainText("Logo, Logo mark: renamed from");
});

test("brand settings, a color edit, preview, and publish work with the local adapter", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("navigation", { name: "Editor" }).getByRole("link", { name: /^Colors/ }).click();
  await expect(page).toHaveURL(/\/admin\/colors\/$/);
  await page.getByRole("button", { name: "Edit Slate", exact: true }).click();
  await details(page).getByLabel("Where it's used").fill("Captions and help text.");
  await expect(page.locator('.admin-card[data-id="slate"]')).toContainText("Edited");

  await page.getByRole("button", { name: "Preview" }).click();
  const frame = page.frameLocator("iframe.preview-frame");
  await expect(frame.getByRole("heading", { level: 1, name: "Colors" })).toBeVisible();
  await page.getByRole("dialog", { name: "Preview, not live" }).getByRole("button", { name: /Close/ }).click();

  // Publishing saves first, which rewrites watched brand files: wait for the dev server's reload before moving
  // on, or it can land mid-edit on the next page.
  const reloadedAfterPublish = page.waitForEvent("framenavigated", { predicate: (f) => f === page.mainFrame() });
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published/ })).toBeVisible({ timeout: 30_000 });
  await reloadedAfterPublish;
  await expect(page.getByRole("heading", { level: 1, name: "Colors" })).toBeVisible({ timeout: 60_000 });
  const colors = JSON.parse(readFileSync(brandFile("colors.json"), "utf8")) as { id: string; help?: string }[];
  expect(colors.find((c) => c.id === "slate")?.help).toBe("Captions and help text.");

  await page.goto("/admin/settings/");
  await page.getByLabel("Short name").fill("Comet, local");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved." })).toBeVisible({ timeout: 30_000 });
  const brand = JSON.parse(readFileSync(brandFile("brand.json"), "utf8")) as { shortName: string };
  expect(brand.shortName).toBe("Comet, local");
});
