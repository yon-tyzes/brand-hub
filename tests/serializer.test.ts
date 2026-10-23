import { describe, expect, it } from "vitest";
import { join } from "node:path";
import type { AnyRecord } from "../schemas/asset.ts";
import { loadBrand } from "../src/content/load.ts";
import { serialize, stableJson, type SerializeInput } from "../src/serializer/index.ts";
import { applyPattern } from "../src/serializer/naming.ts";

const FIXTURE = join(import.meta.dirname, "fixtures", "brand");

function input(edit: (records: AnyRecord[]) => AnyRecord[] = (r) => r, extra: Partial<SerializeInput> = {}): SerializeInput {
  const c = loadBrand(FIXTURE);
  return {
    slug: "demo",
    revision: "rev-1",
    brand: c.brand,
    base: { records: c.all, sources: c.sources, changelog: c.changelog },
    records: edit(structuredClone(c.all)),
    uploads: [],
    date: "2026-11-01",
    author: "Test Editor",
    ...extra,
  };
}

const logo = (id: string, extra: object = {}): AnyRecord =>
  ({
    id, type: "logo", label: "Stacked logo", status: "locked", version: "1.0", updated: "2026-10-01", audience: "public",
    lockup: "Stacked", colorway: "Full color", background: "light",
    files: [{ ext: "svg", path: "files/logos/upload.svg" }, { ext: "png", path: "files/logos/upload.png", width: 1200 }],
    ...extra,
  }) as AnyRecord;

const uploads = [
  { path: "files/logos/upload.svg", name: "My Logo.svg", content: "<svg/>" },
  { path: "files/logos/upload.png", name: "My Logo.png", content: "png-bytes", width: 1200 },
];

/** A comparable copy of a result: blobs are strings in these tests. */
const snapshot = (r: unknown) => JSON.stringify(r);

describe("serialize", () => {
  it("gives byte-identical output for the same input, in any record order", () => {
    const make = () => input((rs) => [...rs, logo("stacked-logo")], { uploads });
    const a = serialize(make());
    const b = serialize(make());
    const shuffled = make();
    shuffled.records = [...shuffled.records].reverse();
    shuffled.uploads = [...uploads].reverse();
    expect(a.ok).toBe(true);
    expect(snapshot(a)).toBe(snapshot(b));
    expect(snapshot(serialize(shuffled))).toBe(snapshot(a));
  });

  it("writes stable JSON: sorted keys, two-space indent, trailing newline", () => {
    expect(stableJson({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } })).toBe('{\n  "a": {\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n');
  });

  it("names uploads with the brand pattern and points records at the final paths", () => {
    const r = serialize(input((rs) => [...rs, logo("stacked-logo")], { uploads }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.renamed).toEqual({
      "files/logos/upload.svg": "files/logos/demo-logo-stacked-full-color.svg",
      "files/logos/upload.png": "files/logos/demo-logo-stacked-full-color-1200.png",
    });
    const written = r.records.find((x) => x.id === "stacked-logo") as Extract<AnyRecord, { type: "logo" }>;
    expect(written.files.map((f) => f.path)).toEqual(Object.values(r.renamed));
    expect(r.changeSet.upserts.map((u) => u.path)).toEqual([
      "brands/demo/logos.json",
      "brands/demo/changelog.json",
      "brands/demo/files/logos/demo-logo-stacked-full-color-1200.png",
      "brands/demo/files/logos/demo-logo-stacked-full-color.svg",
    ]);
  });

  it("uses a custom pattern from brand.json and avoids name collisions", () => {
    const base = input();
    base.brand = { ...base.brand, naming: { icon: "{brand}-{group}-{label}.{ext}" } };
    base.records = [
      ...base.records,
      { ...base.records.find((r) => r.id === "icon-search")!, id: "icon-a", label: "Search", svgPath: "files/icons/up-a.svg" } as AnyRecord,
      { ...base.records.find((r) => r.id === "icon-search")!, id: "icon-b", label: "Search", svgPath: "files/icons/up-b.svg" } as AnyRecord,
    ];
    base.uploads = [
      { path: "files/icons/up-a.svg", name: "a.svg", content: "<svg/>" },
      { path: "files/icons/up-b.svg", name: "b.svg", content: "<svg/>" },
    ];
    const r = serialize(base);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.renamed).toEqual({ "files/icons/up-a.svg": "files/icons/demo-interface-search.svg", "files/icons/up-b.svg": "files/icons/demo-interface-search-2.svg" });
    expect(applyPattern("{brand}-logo-{lockup}-{colorway}-{width}.{ext}", { brand: "x", record: logo("l", { lockup: "", colorway: "" }), original: "a.svg" })).toBe("x-logo.svg");
  });

  it("sets updated on changed records and bumps the version when files change", () => {
    const r = serialize(
      input(
        (rs) =>
          rs.map((x) =>
            x.id === "icon-check" ? ({ ...x, svgPath: "files/icons/new-check.svg" } as AnyRecord) : x.id === "inter" ? { ...x, label: "Inter Sans" } : x.id === "icon-copy" ? { ...x, order: 99 } : x,
          ),
        { uploads: [{ path: "files/icons/new-check.svg", name: "check.svg", content: "<svg/>" }] },
      ),
    );
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const byId = (id: string) => r.records.find((x) => x.id === id)!;
    expect(byId("icon-check")).toMatchObject({ updated: "2026-11-01", version: "1.1" });
    expect(byId("inter")).toMatchObject({ updated: "2026-11-01", version: "1.0" });
    expect(byId("icon-copy")).toMatchObject({ updated: "2026-10-22", version: "1.0" });
    expect(r.changeSet.deletes).toEqual(["brands/demo/files/icons/check.svg"]);
    expect(r.changeSet.summary).toEqual(["Icon, Check: file replaced", 'Font, Inter Sans: renamed from "Inter"', "Icons: order changed"]);
  });

  it("logs changes people can see, not drafts", () => {
    const r = serialize(input((rs) => [...rs.map((x) => (x.id === "icon-check" ? { ...x, status: "retired" as const } : x)), { ...logo("draft-logo"), status: "draft" } as AnyRecord], { uploads }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.changelog.filter((e) => e.date === "2026-11-01")).toEqual([
      { date: "2026-11-01", assetId: "icon-check", assetType: "icon", change: "retired", summary: "Check: retired", author: "Test Editor" },
    ]);
  });

  it("ignores key order when deciding what changed", () => {
    const r = serialize(input((rs) => rs.map((x) => Object.fromEntries(Object.entries(x).reverse()) as AnyRecord)));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.changes).toEqual([]);
  });

  it("leaves unchanged data files alone", () => {
    const r = serialize(input());
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.changeSet).toEqual({ base: "rev-1", upserts: [], deletes: [], summary: [] });
  });
});

describe("serialize validation", () => {
  const errorsOf = (s: SerializeInput) => {
    const r = serialize(s);
    if (r.ok) throw new Error("expected errors");
    return r.errors;
  };

  it("maps every failure to an item id and writes nothing", () => {
    const errors = errorsOf(
      input((rs) => [
        ...rs.filter((x) => x.id !== "one-green-action" && x.id !== "kiln-white"),
        { ...logo("bad-logo"), files: [] } as AnyRecord,
      ]),
    );
    expect(errors.every((e) => typeof e.id === "string")).toBe(true);
    const by = (code: string, id: string) => errors.find((e) => e.code === code && e.id === id);
    // Schema: a logo needs at least one file.
    expect(by("schema", "bad-logo")).toMatchObject({ field: "files" });
    // References: colors governed by a deleted rule, and a pairing with a deleted color.
    expect(by("reference", "comet-green")).toMatchObject({ field: "governedBy", ref: "one-green-action" });
    expect(errors.find((e) => e.id === "comet-green" && e.field === "pairings")).toMatchObject({ ref: "kiln-white" });
  });

  it("ties a missing file to the item that points to it", () => {
    const errors = errorsOf(input((rs) => rs.map((x) => (x.id === "icon-copy" ? ({ ...x, svgPath: "files/icons/never-uploaded.svg" } as AnyRecord) : x))));
    expect(errors).toEqual([expect.objectContaining({ id: "icon-copy", code: "file-not-found", field: "svgPath", ref: "files/icons/never-uploaded.svg" })]);
  });

  it("points brand-wide references at the item they name", () => {
    const base = input((rs) => rs.filter((x) => x.id !== "inter"));
    base.brand = { ...base.brand, quickDownloads: ["inter"] };
    expect(errorsOf(base)).toEqual([expect.objectContaining({ id: "inter", code: "reference", field: "quickDownloads" })]);
  });

  it("flags a pairing that is no longer readable on the color that declares it", () => {
    const errors = errorsOf(input((rs) => rs.map((x) => (x.id === "kiln-white" ? ({ ...x, hex: "#8FA89F", rgb: [143, 168, 159] } as AnyRecord) : x))));
    expect(errors.map((e) => [e.id, e.code])).toEqual([
      ["comet-green", "contrast"],
      ["kiln-white", "contrast"],
    ]);
  });
});
