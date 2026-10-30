// The full brand guide PDF (ENGINE_SPEC.md, section 5, Brand guide PDF): brand.json guide.pdf, the landing
// page button label with the file size, and the search entry.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BrandDataError, loadBrand } from "../src/content/load.ts";
import { createSite, formatBytes } from "../src/site/data.ts";
import { demoCopy, edit } from "./helpers.ts";

const PDF = "files/guide/demo-brand-guide.pdf";

function withPdf(file: boolean) {
  const { brandDir } = demoCopy();
  edit(brandDir, "brand.json", (b) => {
    b.guide.pdf = { path: PDF, updated: "2026-10-30" };
  });
  if (file) {
    mkdirSync(join(brandDir, "files", "guide"), { recursive: true });
    writeFileSync(join(brandDir, PDF), "%PDF-1.7\n");
  }
  return brandDir;
}

function siteFor(brandDir: string, sizeOf?: (path: string) => number) {
  const c = loadBrand(brandDir);
  return createSite({
    brand: c.brand, config: { modules: ["guide"], indexing: false, search: { shortcut: [] }, hero: { preset: "mesh" } }, engineVersion: "0.2.2",
    assets: c.assets, rules: c.rules, changelog: c.changelog, urlFor: (p) => `/${p}`, svgFor: () => undefined, sizeOf,
  });
}

describe("brand guide PDF", () => {
  it("fails the build when the file does not exist", () => {
    let error: unknown;
    try {
      loadBrand(withPdf(false));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BrandDataError);
    expect((error as BrandDataError).problems).toHaveLength(1);
    expect((error as BrandDataError).problems[0]!.problem).toMatch(/^guide\.pdf\.path: file not found: .*demo-brand-guide\.pdf$/);
  });

  it("rejects a path that is not a PDF and a date that is not YYYY-MM-DD", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.guide.pdf = { path: "files/guide/guide.docx", updated: "30 October" };
    });
    expect(() => loadBrand(brandDir)).toThrow(/guide\.pdf\.path: must point to a \.pdf file[\s\S]*guide\.pdf\.updated/);
  });

  it("labels the button with the size read from the file", () => {
    const site = siteFor(withPdf(true), () => 1_234_567);
    expect(site.guidePdf()).toEqual({ href: `/${PDF}`, label: "Open the full guide (PDF, 1.2 MB)" });
  });

  it("leaves the size out where it is not known, and shows nothing without guide.pdf", () => {
    expect(siteFor(withPdf(true)).guidePdf()?.label).toBe("Open the full guide (PDF)");
    expect(siteFor(demoCopy().brandDir).guidePdf()).toBeUndefined();
  });

  it("formats sizes in KB and MB", () => {
    expect([formatBytes(400), formatBytes(145_107), formatBytes(2_500_000)]).toEqual(["1 KB", "145 KB", "2.5 MB"]);
  });
});
