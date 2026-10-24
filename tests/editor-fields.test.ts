// The 0.2 editor fields and Brand settings: validation, the change list, and what the serializer writes.
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import type { AnyRecord, TemplateAsset } from "../schemas/asset.ts";
import type { BrandContent } from "../src/adapters/types.ts";
import { changes, serializeDraft } from "../src/admin/editor/changeset.ts";
import { pathForView, STATUS_OPTIONS, viewFromPath } from "../src/admin/editor/modules.ts";
import { brandOf, initialState, reducer, updateBrand, updateRecord } from "../src/admin/editor/state.ts";
import { validate } from "../src/admin/editor/validate.ts";
import { loadBrand } from "../src/content/load.ts";
import { describeBrandChange } from "../src/serializer/index.ts";

const c = loadBrand(join(import.meta.dirname, "fixtures", "brand"));
const base: BrandContent = { slug: "demo", brand: c.brand, records: c.all, sources: c.sources, changelog: c.changelog, svgs: {} };

const template = (formats: TemplateAsset["formats"], extra: Partial<TemplateAsset> = {}): TemplateAsset => ({
  id: "template-letterhead", label: "Letterhead", status: "draft", version: "1.0", updated: "2026-10-23", audience: "public",
  type: "template", category: "Print", formats, thumbnail: "files/icons/check.svg", rules: [], ...extra,
});

describe("template formats", () => {
  it("needs a Canva link or at least one file", () => {
    expect(validate(template({})).formats).toBe("Add a Canva link or at least one file.");
    expect(validate(template({ canva: "https://www.canva.com/design/abc/view" })).formats).toBeUndefined();
    expect(validate(template({ pdf: "files/templates/letterhead.pdf" })).formats).toBeUndefined();
    // A 0.1 link still counts until it is moved.
    expect(validate(template({}, { url: "https://example.com/t" })).formats).toBeUndefined();
  });

  it("asks for the right file type in each slot", () => {
    expect(validate(template({ docx: "files/templates/letterhead.pdf" })).formats).toBe("Upload a DOCX file.");
  });

  it("names uploaded format files with the brand pattern", () => {
    const t = template({ pdf: "files/templates/Letterhead final.pdf" }, { status: "locked" });
    const state = initialState("rev", base, {
      records: [...base.records, t as AnyRecord],
      files: { "files/templates/Letterhead final.pdf": { path: "files/templates/Letterhead final.pdf", name: "Letterhead final.pdf", type: "application/pdf", blob: new Blob(["%PDF"]) } },
    });
    const withThumb = { ...state, base: { ...state.base } };
    const r = serializeDraft(withThumb, "Test", "2026-11-01");
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const saved = r.records.find((x) => x.id === "template-letterhead") as TemplateAsset;
    expect(saved.formats.pdf).toBe("files/templates/demo-template-letterhead.pdf");
    expect(r.changeSet.upserts.map((u) => u.path)).toContain("brands/demo/files/templates/demo-template-letterhead.pdf");
  });
});

describe("rule chapter", () => {
  it("must be a chapter from brand settings when saving", () => {
    const state = reducer(initialState("rev", base), { type: "apply", edit: updateRecord("one-green-action", { chapter: "nowhere" } as Partial<AnyRecord>) });
    const r = serializeDraft(state, "Test", "2026-11-01");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContainEqual(expect.objectContaining({ id: "one-green-action", field: "chapter" }));
  });
});

describe("brand settings", () => {
  const edited = reducer(initialState("rev", base), {
    type: "apply",
    edit: updateBrand(base.brand, (b) => ({ ...b, shortName: "Comet", tokens: { color: { primary: "#9A4A24" } } })),
  });

  it("lists brand settings as one change, naming what changed", () => {
    expect(changes(base, edited.present)).toEqual([
      expect.objectContaining({ id: "brand:settings", line: "Brand settings: name, primary color changed" }),
    ]);
    expect(brandOf(edited).shortName).toBe("Comet");
    expect(describeBrandChange(base.brand, base.brand)).toBeUndefined();
  });

  it("writes brand.json only when settings changed, with the line in the summary", () => {
    const r = serializeDraft(edited, "Test", "2026-11-01");
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const brandFile = r.changeSet.upserts.find((u) => u.path === "brands/demo/brand.json");
    expect(JSON.parse(String(brandFile?.content))).toMatchObject({ shortName: "Comet", tokens: { color: { primary: "#9A4A24" } } });
    expect(r.changeSet.summary[0]).toBe("Brand settings: name, primary color changed");

    const none = serializeDraft(initialState("rev", base), "Test", "2026-11-01");
    if (!none.ok) throw new Error("unexpected");
    expect(none.changeSet.upserts.some((u) => u.path.endsWith("brand.json"))).toBe(false);
  });

  it("refuses a Quick download that is not live", () => {
    const state = reducer(initialState("rev", base), { type: "apply", edit: updateBrand(base.brand, (b) => ({ ...b, quickDownloads: ["no-such-asset"] })) });
    expect(serializeDraft(state, "Test", "2026-11-01").ok).toBe(false);
  });

  it("undoes like any other edit", () => {
    expect(reducer(edited, { type: "undo" }).present.brand).toBeUndefined();
  });
});

describe("editor addresses and statuses", () => {
  it("maps /admin to the Overview and /admin/<section>/ to a module or Brand settings", () => {
    expect(viewFromPath("/admin/")).toBe("overview");
    expect(viewFromPath("/admin/colors/")).toBe("colors");
    expect(viewFromPath("/admin/settings")).toBe("settings");
    expect(viewFromPath("/admin/nope/")).toBe("overview");
    expect(pathForView("colors")).toBe("/admin/colors/");
    expect(pathForView("overview")).toBe("/admin/");
  });

  it("uses the spec's status labels order and help text", () => {
    expect(STATUS_OPTIONS.map((s) => s.value)).toEqual(["locked", "pending", "draft", "retired"]);
    expect(STATUS_OPTIONS.find((s) => s.value === "pending")?.help).toBe("Not on the site yet. Waiting for approval.");
    expect(STATUS_OPTIONS.find((s) => s.value === "retired")?.help).toBe("It leaves the site when you publish. You can restore it later.");
  });
});
