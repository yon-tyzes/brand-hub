// Measures the JavaScript the home page loads, gzipped, before and after opening search.
// Budget (spec section 6): home page JS under 100 KB gzipped.
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const BUDGET = 100 * 1024;

function collect(page: Page) {
  const files = new Map<string, { raw: number; gzip: number }>();
  page.on("response", async (res) => {
    const type = res.request().resourceType();
    if (type !== "script" && !res.url().endsWith(".js")) return;
    const body = await res.body().catch(() => null);
    if (body) files.set(new URL(res.url()).pathname, { raw: body.length, gzip: gzipSync(body, { level: 9 }).length });
  });
  return files;
}

const total = (m: Map<string, { gzip: number }>) => [...m.values()].reduce((s, f) => s + f.gzip, 0);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

test("home page JS stays under 100 KB gzipped", async ({ page }) => {
  const files = collect(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const initial = total(files);
  const initialFiles = Object.fromEntries(files);

  await page.keyboard.press("/");
  await page.getByRole("searchbox", { name: "Search assets and rules" }).fill("green");
  await expect(page.getByRole("button", { name: /Comet Green/ }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  const withSearch = total(files);

  const report = { budget: kb(BUDGET), initial: kb(initial), withSearchOpen: kb(withSearch), initialFiles, allFiles: Object.fromEntries(files) };
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/js-size.json", JSON.stringify(report, null, 2));
  console.log(`home JS gzipped: initial ${kb(initial)}, after opening search ${kb(withSearch)} (budget ${kb(BUDGET)})`);

  expect(initial).toBeLessThan(BUDGET);
  expect(withSearch).toBeLessThan(BUDGET);
});
