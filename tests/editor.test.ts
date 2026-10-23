import { describe, expect, it } from "vitest";
import type { AnyRecord } from "../schemas/asset.ts";
import type { BrandContent } from "../src/adapters/types.ts";
import { changes, toChangeSet } from "../src/admin/editor/changeset.ts";
import { cleanName, uploadPath } from "../src/admin/editor/files.ts";
import { canvaLinkWarning } from "../src/admin/editor/links.ts";
import { EDITOR_MODULES, newRecord, uniqueId } from "../src/admin/editor/modules.ts";
import {
  addRecord, attachFiles, deleteRecord, initialState, moveBy, reducer, retire, setStatus, updateRecord,
  type EditorAction, type EditorState,
} from "../src/admin/editor/state.ts";
import { validate } from "../src/admin/editor/validate.ts";

const rec = (id: string, type: AnyRecord["type"], extra: object = {}): AnyRecord =>
  ({ id, type, label: id, status: "locked", version: "1.0", updated: "2026-10-22", audience: "public", ...extra }) as AnyRecord;

const logo = (id: string, order: number) =>
  rec(id, "logo", { order, lockup: "Horizontal", colorway: "Full color", background: "light", files: [{ ext: "svg", path: `files/logos/${id}.svg` }] });

function base(): BrandContent {
  return {
    slug: "demo",
    brand: {} as BrandContent["brand"],
    records: [logo("a", 1), logo("b", 2), logo("c", 3), rec("r", "rule", { title: "R", body: "x", do: [], dont: [], appliesTo: [] })],
    sources: { a: "logos.json", b: "logos.json", c: "logos.json", r: "rules.json" },
    svgs: {},
  };
}

const run = (s: EditorState, ...actions: EditorAction[]) => actions.reduce(reducer, s);
const apply = (edit: Parameters<typeof reducer>[1] extends infer A ? (A extends { edit: infer E } ? E : never) : never, key?: string, now?: number): EditorAction => ({ type: "apply", edit, key, now });

describe("editor history", () => {
  it("undoes and redoes every edit", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(updateRecord("a", { label: "Alpha" })), apply(retire(["b"])));
    expect(s.present.records.find((r) => r.id === "b")!.status).toBe("retired");
    s = run(s, { type: "undo" });
    expect(s.present.records.find((r) => r.id === "b")!.status).toBe("locked");
    s = run(s, { type: "undo" });
    expect(s.present.records.find((r) => r.id === "a")!.label).toBe("a");
    s = run(s, { type: "redo" }, { type: "redo" });
    expect(s.present.records.find((r) => r.id === "b")!.status).toBe("retired");
  });

  it("merges typing in one field into a single undo step", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(updateRecord("a", { label: "A" }), "a.label", 1000), apply(updateRecord("a", { label: "Al" }), "a.label", 1500), apply(updateRecord("a", { label: "Alp" }), "a.label", 2000));
    expect(s.past).toHaveLength(1);
    s = run(s, { type: "undo" });
    expect(s.present.records.find((r) => r.id === "a")!.label).toBe("a");
  });

  it("ignores edits that change nothing", () => {
    const s = initialState("rev1", base());
    expect(run(s, apply(setStatus(["a"], "locked")))).toBe(s);
  });

  it("moves records with the keyboard alternative to drag", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(moveBy("c", -1)));
    const order = (id: string) => s.present.records.find((r) => r.id === id)!.order;
    expect([order("a"), order("c"), order("b")]).toEqual([1, 2, 3]);
    expect(run(s, apply(moveBy("a", -1)))).toBe(s);
  });
});

describe("change set", () => {
  it("has the spec shape and lists each change in plain words", () => {
    let s = initialState("rev1", base());
    const svg = new Blob(["<svg/>"], { type: "image/svg+xml" });
    const added = newRecord(EDITOR_MODULES[0]!, "New logo", new Set(["a", "b", "c"]), {
      files: [{ ext: "svg", path: "files/logos/new-logo.svg" }],
    } as Partial<AnyRecord>);
    s = run(
      s,
      apply(addRecord(added, [{ path: "files/logos/new-logo.svg", name: "new-logo.svg", type: "image/svg+xml", blob: svg }])),
      apply(updateRecord("a", { label: "Primary logo" })),
      apply(setStatus(["b"], "pending")),
      apply(deleteRecord("c")),
      apply(attachFiles("b", [{ path: "files/logos/b-2.svg", name: "b.svg", type: "image/svg+xml", blob: svg }], { files: [{ ext: "svg", path: "files/logos/b-2.svg" }] } as Partial<AnyRecord>)),
    );
    const cs = toChangeSet(s);
    expect(cs.base).toBe("rev1");
    expect(cs.summary).toEqual([
      'Logo, Primary logo: renamed from "a"',
      "Logo, b: set to Pending, files changed",
      "Logo, New logo: added",
      "Logo, c: deleted",
    ]);
    expect(cs.upserts.map((u) => u.path)).toEqual(["brands/demo/logos.json", "brands/demo/files/logos/new-logo.svg", "brands/demo/files/logos/b-2.svg"]);
    const written = JSON.parse(cs.upserts[0]!.content as string) as AnyRecord[];
    expect(written.map((r) => r.id)).toEqual(["a", "b", "new-logo"]);
    expect(cs.deletes).toEqual(["brands/demo/files/logos/b.svg", "brands/demo/files/logos/c.svg"]);
  });

  it("reports a reorder once per section and leaves other files alone", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(moveBy("b", 1)));
    const cs = toChangeSet(s);
    expect(cs.summary).toEqual(["Logos: order changed"]);
    expect(cs.upserts.map((u) => u.path)).toEqual(["brands/demo/logos.json"]);
  });

  it("is empty when nothing changed or every change was undone", () => {
    let s = initialState("rev1", base());
    expect(changes(s.base, s.present)).toEqual([]);
    s = run(s, apply(retire(["a"])), { type: "undo" });
    expect(toChangeSet(s)).toEqual({ base: "rev1", upserts: [], deletes: [], summary: [] });
  });
});

describe("editor helpers", () => {
  it("cleans file names into labels and paths", () => {
    expect(cleanName("pocket-comet_HORIZONTAL  full.color.svg")).toBe("Pocket comet horizontal full color");
    expect(uploadPath("logos", "Pocket Comet.svg", new Set(["files/logos/pocket-comet.svg"]))).toBe("files/logos/pocket-comet-2.svg");
    expect(uniqueId("Horizontal logo", new Set(["horizontal-logo"]))).toBe("horizontal-logo-2");
  });

  it("warns about Canva edit links only", () => {
    expect(canvaLinkWarning("https://www.canva.com/design/DAF123/edit")).toMatch(/edit link/);
    expect(canvaLinkWarning("https://www.canva.com/design/DAF123/abcToken/view?mode=preview")).toBeUndefined();
    expect(canvaLinkWarning("https://example.com/design/x/edit")).toBeUndefined();
  });

  it("explains validation problems without technical terms", () => {
    const r = newRecord(EDITOR_MODULES.find((m) => m.id === "templates")!, "Poster", new Set(), { url: "not a link" } as Partial<AnyRecord>);
    const errors = validate(r);
    expect(errors).toMatchObject({ category: "This can't be empty.", thumbnail: "This can't be empty.", url: "Enter a full web address that starts with https://" });
    for (const m of Object.values(errors)) expect(m).not.toMatch(/json|schema|path|regex|string|kebab/i);
  });
});
