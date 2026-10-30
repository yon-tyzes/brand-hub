// Icons page: search shows matching icons in one grid, Escape restores the groups, and the chosen color chip
// carries a check (ENGINE_SPEC.md, section 6, Shared interactions).
import { expect, test } from "@playwright/test";

test("a query shows matching icons, and a result opens in the panel", async ({ page }) => {
  await page.goto("/icons/");
  await page.getByLabel("Filter icons by name").fill("ARR");
  await expect(page.locator("[data-icon-count]")).toHaveText('4 icons match "ARR"');
  await expect(page.locator(".icon-group-title").first()).toBeHidden();
  await expect(page.locator("[data-icon-item]:visible")).toHaveCount(4);
  await page.getByRole("button", { name: "Arrow left", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Selected icon" }).getByRole("heading", { name: "Arrow left" })).toBeVisible();
});

test("Escape clears the query and restores the groups", async ({ page }) => {
  await page.goto("/icons/");
  const field = page.getByLabel("Filter icons by name");
  await field.fill("zzq");
  await expect(page.getByText('No icons match "zzq".')).toBeVisible();
  await field.press("Escape");
  await expect(field).toHaveValue("");
  await expect(page.locator(".icon-group-title:visible")).not.toHaveCount(0);
  await expect(page.locator("[data-icon-count]")).toHaveText(/^(\d+) of \1 icons$/);
  await expect(page.getByRole("button", { name: "Clear search" })).toBeHidden();
});

test("the chosen color chip shows its check, and only that one", async ({ page }) => {
  await page.goto("/icons/");
  const chosen = page.getByRole("radio", { name: "Comet Green on Kiln White" });
  await chosen.click();
  await expect(chosen).toHaveAttribute("aria-checked", "true");
  await expect(chosen.locator(".pair-check")).toBeVisible();
  await expect(page.locator(".pair-check:visible")).toHaveCount(1);
});
