// Editor at /admin: add by drop, inline rename, status, retire and undo, keyboard reorder, autosave,
// leave guard, inspector focus, accessibility, and no technical terms on screen.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" onload="alert(1)"><script>alert(1)</script><rect width="120" height="40" fill="#1E5B4A"/></svg>`;

async function open(page: Page) {
  await page.goto("/admin/logos/");
  await expect(page.getByRole("list", { name: "Logos" })).toBeVisible();
}

async function dropFiles(page: Page, selector: string, files: { name: string; type: string; text: string }[]) {
  const dt = await page.evaluateHandle((list) => {
    const dt = new DataTransfer();
    for (const f of list) dt.items.add(new File([f.text], f.name, { type: f.type }));
    return dt;
  }, files);
  await page.dispatchEvent(selector, "dragover", { dataTransfer: dt });
  await page.dispatchEvent(selector, "drop", { dataTransfer: dt });
}

const cardNames = (page: Page) => page.locator(".admin-cards .admin-card-title").allInnerTexts();
const card = (page: Page, name: string) => page.locator(".admin-card", { has: page.getByRole("button", { name: `Edit ${name}`, exact: true }) });

async function openCardMenu(page: Page, name: string) {
  await page.getByRole("button", { name: `More actions for ${name}`, exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: `More actions for ${name}` })).toBeVisible();
}

async function chooseMenuItem(page: Page, item: string) {
  for (let i = 0; i < 8; i++) {
    if ((await page.evaluate(() => document.activeElement?.textContent)) === item) break;
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

test("add a logo by dropping a file on the grid", async ({ page }) => {
  await open(page);
  await dropFiles(page, ".admin-grid-panel", [{ name: "pocket-comet_stacked-REVERSED.svg", type: "image/svg+xml", text: LOGO_SVG }]);

  const added = card(page, "Pocket comet stacked reversed");
  await expect(added).toBeVisible();
  await expect(added.locator(".status-badge").first()).toHaveText("Draft");

  // Prefilled from the file name, cleaned, and opened in the inspector.
  const details = page.getByRole("complementary", { name: "Details" });
  await expect(details.getByLabel("Name", { exact: true })).toHaveValue("Pocket comet stacked reversed");
  await expect(details.getByLabel("Layout")).toHaveValue("Stacked");
  await expect(details.getByLabel("Color version")).toHaveValue("Reversed");
  await expect(details.getByLabel("Made for")).toHaveValue("dark");
  await expect(details.getByText("Removed 1 script.")).toBeVisible();
  await expect(details.getByText("Removed 1 event handler.")).toBeVisible();
  await expect(page.locator(".count-dot")).toHaveText("1");
});

test("rename inline: Enter saves, Escape cancels", async ({ page }) => {
  await open(page);
  await openCardMenu(page, "Stacked logo");
  await chooseMenuItem(page, "Rename");
  const input = page.getByLabel("Name for Stacked logo");
  await expect(input).toBeFocused();
  await input.fill("Stacked logo, full color");
  await page.keyboard.press("Enter");
  await expect(card(page, "Stacked logo, full color")).toBeVisible();

  await page.getByRole("button", { name: "Edit Logo mark" }).dblclick();
  await page.getByLabel("Name for Logo mark").fill("Something else");
  await page.keyboard.press("Escape");
  await expect(card(page, "Logo mark")).toBeVisible();
  await expect(page.locator(".count-dot")).toHaveText("1");
});

test("change status with the segmented control", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit Logo mark" }).click();
  const status = page.getByRole("radiogroup", { name: "Status" });
  await expect(status.getByRole("radio", { name: "Live" })).toBeChecked();
  await status.getByRole("radio", { name: "Live" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(status.getByRole("radio", { name: "Pending" })).toBeChecked();
  await expect(page.locator(".ed-status-help")).toHaveText("Not on the site yet. Waiting for approval.");
  await expect(card(page, "Logo mark").locator(".status-badge").first()).toHaveText("Pending");

  await page.getByRole("button", { name: /unsaved change/ }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toContainText("Logo, Logo mark: set to Pending");
});

test("retire with the menu, then undo from the toast and with the keyboard", async ({ page }) => {
  await open(page);
  await openCardMenu(page, "Horizontal logo");
  await chooseMenuItem(page, "Retire");
  const badge = card(page, "Horizontal logo").locator(".status-badge").first();
  await expect(badge).toHaveText("Retired");
  await expect(page.getByRole("status").filter({ hasText: "Horizontal logo retired" })).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).last().click();
  await expect(badge).toHaveText("Live");

  // Ctrl/Cmd+Z undoes the last edit (the restore), Shift+Ctrl/Cmd+Z redoes it.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(badge).toHaveText("Retired");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(badge).toHaveText("Live");
});

test("reorder with Move up and Move down from the keyboard", async ({ page }) => {
  await open(page);
  expect(await cardNames(page)).toEqual(["Horizontal logo", "Horizontal logo, reversed", "Stacked logo", "Logo mark"]);
  await openCardMenu(page, "Horizontal logo");
  await chooseMenuItem(page, "Move down");
  expect(await cardNames(page)).toEqual(["Horizontal logo, reversed", "Horizontal logo", "Stacked logo", "Logo mark"]);
  await expect(page.getByRole("button", { name: "More actions for Horizontal logo", exact: true })).toBeFocused();

  await openCardMenu(page, "Logo mark");
  await chooseMenuItem(page, "Move up");
  expect(await cardNames(page)).toEqual(["Horizontal logo, reversed", "Horizontal logo", "Logo mark", "Stacked logo"]);
  await page.getByRole("button", { name: /unsaved change/ }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toContainText("Logos: order changed");
});

test("autosave keeps changes across a reload, and leaving asks first", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit Logo mark" }).click();
  await page.getByRole("complementary", { name: "Details" }).getByLabel("Name", { exact: true }).fill("Mark only");
  await expect(card(page, "Mark only")).toBeVisible();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(card(page, "Mark only")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "unsaved changes from last time" })).toBeVisible();

  let asked = false;
  page.on("dialog", async (d) => {
    asked = d.type() === "beforeunload";
    await d.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked).toBe(true);
});

test("editor shows no technical terms and passes axe", async ({ page }) => {
  await open(page);
  const sections = ["Logos", "Colors", "Fonts", "Icons", "Photos", "Templates", "Rules"];
  for (const s of sections) {
    await page.locator(".ed-side-item", { hasText: s }).click();
    await page.locator(".admin-card-title").first().click();
    await expect(page.getByRole("complementary", { name: "Details" }).locator(".inspector")).toBeVisible();
    const text = await page.locator("body").innerText();
    expect(text, s).not.toMatch(/\bjson\b|schema|brands\/|files\/|[\w-]+\/[\w-]+\.\w{2,5}\b/i);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${s}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});

test("replace a file by dropping it on a card, with a side-by-side check first", async ({ page }) => {
  await open(page);
  await dropFiles(page, '.admin-card[data-id="logo-mark"]', [{ name: "new-mark.svg", type: "image/svg+xml", text: LOGO_SVG }]);
  const dialog = page.getByRole("dialog", { name: "Replace the file for Logo mark?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Current file" })).toBeVisible();
  await expect(dialog.getByRole("img", { name: "New file" })).toBeVisible();
  await expect(dialog.getByText("Removed 1 script.")).toBeVisible();
  await dialog.getByRole("button", { name: "Replace file" }).click();
  await page.getByRole("button", { name: /unsaved change/ }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved changes" })).toContainText("Logo, Logo mark: files changed");
});

test("delete permanently asks first, names the item, and can be undone", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Edit Stacked logo" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  const confirm = page.getByRole("dialog", { name: "Delete Stacked logo permanently?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Delete Stacked logo" }).click();
  await expect(card(page, "Stacked logo")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).last().click();
  await expect(card(page, "Stacked logo")).toBeVisible();
});

test("module editors: hex updates the card live, Canva edit links get a warning, icons add from the picker", async ({ page }) => {
  await open(page);
  await page.locator(".ed-side-item", { hasText: "Colors" }).click();
  await page.getByRole("button", { name: "Edit Copper" }).click();
  const details = page.getByRole("complementary", { name: "Details" });
  const hex = details.getByLabel("Web (HEX)");
  await hex.fill("#12");
  await expect(details.getByText("Enter a 6-digit hex like #1E5B4A.")).toBeVisible();
  await hex.fill("#336699");
  await expect(card(page, "Copper")).toContainText("#336699");
  await expect(card(page, "Copper")).toContainText("Edited");

  await page.locator(".ed-side-item", { hasText: "Templates" }).click();
  await page.getByRole("button", { name: "Edit Letterhead" }).click();
  await details.getByLabel(/Canva link/).fill("https://www.canva.com/design/DAF0000/edit");
  await expect(details.getByText(/This looks like an edit link/)).toBeVisible();

  await page.locator(".ed-side-item", { hasText: "Icons" }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add icon" }).click();
  await (await chooser).setFiles({ name: "steam-cloud.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" stroke="#000000"/></svg>') });
  await expect(card(page, "Steam cloud")).toBeVisible();
  await expect(details.getByText("Set the icon's colors to follow the color chosen on the site.")).toBeVisible();
});

test("Edit moves focus to the inspector's first field; Escape and Close return it to the card", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  const edit = page.getByRole("button", { name: "Edit Horizontal logo", exact: true });
  const details = page.getByRole("complementary", { name: "Details" });

  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(details.getByLabel("Name", { exact: true })).toBeFocused();

  // Escape from a field closes the inspector and puts focus back on the card.
  await page.keyboard.press("Tab");
  await expect(details.getByLabel("Layout")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(details.getByText("Select an item to edit its details.")).toBeVisible();
  await expect(edit).toBeFocused();

  // The Close button does the same.
  await page.keyboard.press("Enter");
  await expect(details.getByLabel("Name", { exact: true })).toBeFocused();
  await details.getByRole("button", { name: "Close details" }).click();
  await expect(edit).toBeFocused();
});

test("on small screens, Edit opens the details sheet on its first field and Escape returns to the card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const edit = page.getByRole("button", { name: "Edit Stacked logo", exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Details: Stacked logo" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel("Name", { exact: true })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(edit).toBeFocused();
});
