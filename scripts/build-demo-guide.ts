// Prints the demo brand's full guide PDF to the path in brand.json guide.pdf: a title page, then each chapter
// from guide.chapters with its locked rules from rules.json (title, body, do, and don't), set in the demo
// brand's own fonts. Every word comes from the demo data. Run after changing demo rules; the PDF is committed.
// Usage: node scripts/build-demo-guide.ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import type { RuleAsset } from "../schemas/asset.ts";
import type { Brand } from "../schemas/brand.ts";

const brandDir = join(import.meta.dirname, "..", "brands", "demo");
const brand = JSON.parse(readFileSync(join(brandDir, "brand.json"), "utf8")) as Brand;
const rules = (JSON.parse(readFileSync(join(brandDir, "rules.json"), "utf8")) as RuleAsset[]).filter((r) => r.status === "locked");
const fontUrl = (file: string) => pathToFileURL(join(brandDir, "files", "fonts", file)).href;

const out = brand.guide.pdf?.path;
if (!out) throw new Error("brands/demo/brand.json has no guide.pdf.path");

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Rule bodies are short markdown: keep the words, drop the emphasis marks. */
const plain = (md: string) => escape(md.replace(/[*_`]/g, ""));
const list = (heading: string, items: string[]) =>
  items.length ? `<h3>${heading}</h3><ul>${items.map((i) => `<li>${escape(i)}</li>`).join("")}</ul>` : "";

const chapters = brand.guide.chapters
  .map((c) => ({ ...c, rules: rules.filter((r) => r.chapter === c.id) }))
  .filter((c) => c.rules.length);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escape(brand.name)} brand guide</title>
<style>
  @font-face { font-family: "Fraunces"; src: url("${fontUrl("fraunces/fraunces-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
  @font-face { font-family: "Inter"; src: url("${fontUrl("inter/inter-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
  @page { size: 8.5in 11in; margin: 0.75in; }
  body { margin: 0; color: #1C2430; font: 11pt/1.55 "Inter", sans-serif; }
  .cover { height: 9.4in; display: flex; flex-direction: column; justify-content: center; gap: 0.25in; break-after: page; }
  .cover h1 { margin: 0; font: 500 40pt/1.05 "Fraunces", serif; color: #1E5B4A; }
  section { break-before: page; }
  section:first-of-type { break-before: auto; }
  h2 { margin: 0 0 0.2in; font: 500 26pt/1.1 "Fraunces", serif; color: #1E5B4A; }
  article { margin: 0 0 0.3in; break-inside: avoid; }
  h3 { margin: 0.12in 0 0.04in; font: 600 11pt/1.3 "Inter", sans-serif; }
  article > h3:first-child { font-size: 14pt; margin-top: 0; }
  p { margin: 0; max-width: 38em; }
  ul { margin: 0; padding-left: 1.2em; }
  .note { color: #59616C; font-size: 10pt; }
</style>
</head>
<body>
  <div class="cover">
    <h1>${escape(brand.name)}<br>Brand guide</h1>
    <p class="note">A demo guide for ${escape(brand.name)}, a fictional brand used to show the Brand Hub engine. In a real brand hub, this file is the brand's own guide.</p>
  </div>
  ${chapters
    .map(
      (c) => `<section>
    <h2>${escape(c.title)}</h2>
    ${c.rules.map((r) => `<article><h3>${escape(r.title)}</h3><p>${plain(r.body)}</p>${list("Do", r.do)}${list("Don't", r.dont)}</article>`).join("\n    ")}
  </section>`,
    )
    .join("\n  ")}
</body>
</html>`;

// The page loads the fonts from disk, so it is opened from a file rather than set as content.
const work = mkdtempSync(join(tmpdir(), "demo-guide-"));
const browser = await chromium.launch();
try {
  const tab = await browser.newPage();
  const file = join(work, "guide.html");
  writeFileSync(file, html);
  await tab.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(join(brandDir, out)), { recursive: true });
  await tab.pdf({ path: join(brandDir, out), preferCSSPageSize: true, printBackground: true });
  console.log(`wrote brands/demo/${out}`);
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
