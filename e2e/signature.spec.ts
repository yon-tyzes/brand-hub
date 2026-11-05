// Email signature (ENGINE_SPEC.md, section 14): fill the form, pick a design and color, add a photo, and copy.
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Both tests use the one system clipboard.
test.describe.configure({ mode: "serial" });

const field = (page: import("@playwright/test").Page, name: string) => page.getByRole("textbox", { name, exact: true });

/** The clipboard's HTML and plain text. */
const clipboard = (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    return { html: await (await item!.getType("text/html")).text(), text: await (await item!.getType("text/plain")).text() };
  });

test("fills the form, picks a design and color, and copies rich HTML", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/create/signature/");
  const preview = page.locator("[data-sig-preview]");
  const copy = page.getByRole("button", { name: "Copy signature" });

  // A required field left empty stops the copy and takes focus.
  await copy.click();
  await expect(field(page, "Name (required)")).toBeFocused();
  await expect(page.getByText("Fill in Name to copy.")).toBeVisible();

  await field(page, "Name (required)").fill("Ada <Quill>");
  await expect(page.getByText("Fill in Name to copy.")).toBeHidden();
  await field(page, "Email (required)").fill("ada@example.test");
  await field(page, "Phone").fill("+1 555 0100");
  await expect(preview).toContainText("Ada <Quill>");

  // Pick Compact by keyboard, then Copper.
  await page.getByRole("radio", { name: "Classic" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Compact" })).toBeChecked();
  await expect(page.locator("[data-sig-photo]")).toBeHidden();
  await page.locator('[data-sig-variants="compact"]').getByText("Copper").click();
  await expect(preview).toContainText("ada@example.test");

  await copy.click();
  await expect(page.locator("[data-toast-region]")).toHaveText("Signature copied");
  const { html, text } = await clipboard(page);
  expect(html).toContain("Ada &lt;Quill&gt;");
  expect(html).toContain('href="tel:+15550100"');
  expect(html).toMatch(/src="http:\/\/127\.0\.0\.1:\d+\/files\/logos\/pocket-comet-mark-full-color\.png"/);
  expect(text).toMatch(/^Ada <Quill>\nada@example\.test\n\+1 555 0100\nhttp:\/\/127\.0\.0\.1:\d+$/);
});

test("adds, changes, and removes a headshot", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/create/signature/");
  await field(page, "Name (required)").fill("Ada Quill");
  await field(page, "Email (required)").fill("ada@example.test");

  const photo = join(import.meta.dirname, "..", "brands", "demo", "files", "logos", "pocket-comet-stacked-full-color.png");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add a photo" }).click();
  await (await chooser).setFiles(photo);
  await expect(page.getByRole("button", { name: "Choose a different photo" })).toBeFocused();
  const headshot = page.locator('[data-sig-preview] img[alt="Ada Quill"]');
  await expect(headshot).toHaveAttribute("src", /^data:image\/png;base64,/);
  // Drawn at twice the 72px display size.
  expect(await headshot.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([144, 144]);

  await page.getByRole("button", { name: "Copy signature" }).click();
  await expect(page.locator("[data-toast-region]")).toHaveText("Signature copied");
  expect((await clipboard(page)).html).toContain('alt="Ada Quill"');

  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByRole("button", { name: "Add a photo" })).toBeFocused();
  await expect(headshot).toHaveCount(0);
});
