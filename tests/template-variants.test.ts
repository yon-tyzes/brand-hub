// Template variants (ENGINE_SPEC.md, section 5, Template variants): the schema, file checks, which links and
// thumbnail each variant gets, and the serializer's file names.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TemplateAsset } from "../schemas/asset.ts";
import { loadBrand } from "../src/content/load.ts";
import { templateLinks, templateThumbnail } from "../src/site/data.ts";
import { demoCopy, write } from "./helpers.ts";

const template = (extra: Partial<TemplateAsset> = {}): TemplateAsset => ({
  id: "template-letterhead", label: "Letterhead", status: "locked", version: "1.0", updated: "2026-10-23", audience: "public",
  type: "template", category: "Print", thumbnail: "files/templates/letterhead.svg", rules: [],
  formats: { pdf: "files/templates/letterhead.pdf" },
  variants: [
    { id: "green", label: "Green", thumbnail: "files/templates/letterhead-green.svg" },
    { id: "ink", label: "Ink", thumbnail: "files/templates/letterhead-ink.svg", formats: { canva: "https://www.canva.com/design/abc/view" } },
  ],
  ...extra,
});
const url = (p: string) => `/${p}`;

/** A fixture copy with one template; `files` lists the template files to create. */
function brandWith(t: TemplateAsset, files: string[]) {
  const { brandDir } = demoCopy();
  mkdirSync(join(brandDir, "files", "templates"), { recursive: true });
  for (const f of files) writeFileSync(join(brandDir, f), "x");
  write(brandDir, "templates.json", JSON.stringify([t]));
  return brandDir;
}

const ALL = ["letterhead.svg", "letterhead.pdf", "letterhead-green.svg", "letterhead-ink.svg"].map((f) => `files/templates/${f}`);

describe("template variants", () => {
  it("uses the first variant's thumbnail and links by default, and the template's formats when a variant has none", () => {
    const t = template();
    expect(templateThumbnail(t)).toBe("files/templates/letterhead-green.svg");
    expect(templateLinks(t, url).map((l) => l.label)).toEqual(["PDF"]);
    expect(templateLinks(t, url, t.variants![1]).map((l) => [l.label, l.href])).toEqual([["Open in Canva", "https://www.canva.com/design/abc/view"]]);
    expect(templateThumbnail(template({ variants: undefined }))).toBe("files/templates/letterhead.svg");
  });

  it("loads a template with variants when every file exists", () => {
    const c = loadBrand(brandWith(template(), ALL));
    expect(c.assets.find((a) => a.id === "template-letterhead")).toMatchObject({ variants: [{ id: "green" }, { id: "ink" }] });
  });

  it("fails on a missing variant file, naming the field", () => {
    expect(() => loadBrand(brandWith(template(), ALL.filter((f) => !f.endsWith("ink.svg"))))).toThrow(/id "template-letterhead": variants\.1\.thumbnail: file not found/);
  });

  it("fails on duplicate variant ids", () => {
    const t = template();
    t.variants![1]!.id = "green";
    expect(() => loadBrand(brandWith(t, ALL))).toThrow(/variants: variant ids must be unique/);
  });
});
