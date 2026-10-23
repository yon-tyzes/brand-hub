// Prints the demo brand's template files: one PDF per template in brands/demo/templates.json, written to the
// path in its formats.pdf. Each page shows the template's preview and says it is a demo file, set in the
// demo brand's own fonts. Run after changing a demo template; the PDFs are committed.
// Usage: node scripts/build-demo-templates.ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import type { TemplateAsset } from "../schemas/asset.ts";

const brandDir = join(import.meta.dirname, "..", "brands", "demo");
const brand = JSON.parse(readFileSync(join(brandDir, "brand.json"), "utf8")) as { name: string };
const templates = JSON.parse(readFileSync(join(brandDir, "templates.json"), "utf8")) as TemplateAsset[];
const fontUrl = (file: string) => pathToFileURL(join(brandDir, "files", "fonts", file)).href;

/** Page size by template category. */
const SIZES: Record<string, { width: string; height: string }> = {
  Print: { width: "8.5in", height: "11in" },
  Slides: { width: "13.333in", height: "7.5in" },
  Social: { width: "8in", height: "8in" },
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(t: TemplateAsset): string {
  const size = SIZES[t.category] ?? SIZES.Print!;
  const svg = readFileSync(join(brandDir, t.thumbnail), "utf8");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(t.label)} | ${escape(brand.name)}</title>
<style>
  @font-face { font-family: "Fraunces"; src: url("${fontUrl("fraunces/fraunces-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "Inter"; src: url("${fontUrl("inter/inter-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
  @page { size: ${size.width} ${size.height}; margin: 0; }
  html, body { margin: 0; width: ${size.width}; height: ${size.height}; }
  body { box-sizing: border-box; padding: 0.75in; display: flex; flex-direction: column; gap: 0.3in; background: #F7F6F2; color: #1C2430; font: 14pt/1.5 "Inter", sans-serif; }
  h1 { margin: 0; font: 500 32pt/1.1 "Fraunces", serif; color: #1E5B4A; }
  p { margin: 0; max-width: 34em; }
  .note { color: #59616C; font-size: 11pt; }
  .preview { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
  .preview svg { width: 100%; height: 100%; }
</style>
</head>
<body>
  <h1>${escape(t.label)}</h1>
  ${t.help ? `<p>${escape(t.help)}</p>` : ""}
  <div class="preview">${svg}</div>
  <p class="note">A demo template file for ${escape(brand.name)}, a fictional brand used to show the Brand Hub engine. In a real brand hub, this file is the template itself.</p>
</body>
</html>`;
}

// The page loads the fonts from disk, so it is opened from a file rather than set as content.
const work = mkdtempSync(join(tmpdir(), "demo-templates-"));
const browser = await chromium.launch();
try {
  const tab = await browser.newPage();
  for (const t of templates) {
    const out = t.formats?.pdf;
    if (!out) {
      console.log(`${t.id}: no formats.pdf, skipped`);
      continue;
    }
    const html = join(work, `${t.id}.html`);
    writeFileSync(html, page(t));
    await tab.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await tab.evaluate(() => document.fonts.ready);
    mkdirSync(dirname(join(brandDir, out)), { recursive: true });
    await tab.pdf({ path: join(brandDir, out), preferCSSPageSize: true, printBackground: true });
    console.log(`${t.id}: wrote brands/demo/${out}`);
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
