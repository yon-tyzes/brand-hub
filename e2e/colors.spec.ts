// Colors page: "Copy hex code" copies the hex and confirms it (ENGINE_SPEC.md, section 6, Shared interactions).
import { expect, test } from "@playwright/test";

test('"Copy hex code" copies the hex and shows the confirmation', async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/colors/");
  await page.getByRole("button", { name: "Copy hex code Comet Green" }).click();
  await expect(page.locator("[data-toast-region]")).toHaveText("Comet Green #1E5B4A copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("#1E5B4A");
});
