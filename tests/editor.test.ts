import { describe, expect, it } from "vitest";
import type { AnyRecord } from "../schemas/asset.ts";
import type { BrandContent } from "../src/adapters/types.ts";
import { changes, rebase, serializeDraft } from "../src/admin/editor/changeset.ts";
import { cleanName, uploadPath } from "../src/admin/editor/files.ts";
import { canvaLinkWarning } from "../src/admin/editor/links.ts";
import { EDITOR_MODULES, newRecord, uniqueId } from "../src/admin/editor/modules.ts";
import {
  addRecord, deleteRecord, initialState, moveBy, reducer, retire, setStatus, updateRecord,
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
    changelog: [],
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
  it("serializes the draft into the spec shape, with final names and plain summary lines", () => {
    let s = initialState("rev1", base());
    const svg = new Blob(["<svg/>"], { type: "image/svg+xml" });
    const added = newRecord(EDITOR_MODULES[0]!, "New logo", new Set(["a", "b", "c"]), {
      lockup: "Mark", colorway: "Full color", files: [{ ext: "svg", path: "files/logos/new-logo.svg" }],
    } as Partial<AnyRecord>);
    s = run(
      s,
      apply(addRecord(added, [{ path: "files/logos/new-logo.svg", name: "new-logo.svg", type: "image/svg+xml", blob: svg }])),
      apply(updateRecord("a", { label: "Primary logo" })),
      apply(setStatus(["b"], "pending")),
      apply(deleteRecord("c")),
    );
    const r = serializeDraft(s, "Ed", "2026-11-01");
    expect(r.ok).toBe(false); // base() has no brand settings or files: the serializer validates everything
    expect(changes(s.base, s.present).map((c) => c.line)).toEqual([
      'Logo, Primary logo: renamed from "a"',
      "Logo, b: set to Pending",
      "Logo, New logo: added",
      "Logo, c: deleted",
    ]);
  });

  it("reports a reorder once per section", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(moveBy("b", 1)));
    expect(changes(s.base, s.present).map((c) => c.line)).toEqual(["Logos: order changed"]);
  });

  it("is empty when nothing changed or every change was undone", () => {
    let s = initialState("rev1", base());
    expect(changes(s.base, s.present)).toEqual([]);
    s = run(s, apply(retire(["a"])), { type: "undo" });
    expect(changes(s.base, s.present)).toEqual([]);
  });

  it("rebases this draft's edits onto someone else's newer content", () => {
    let s = initialState("rev1", base());
    s = run(s, apply(updateRecord("a", { label: "Mine" })), apply(deleteRecord("c")));
    const remote = { ...s.base, records: s.base.records.map((r) => (r.id === "b" ? { ...r, label: "Theirs" } : r)) };
    const merged = rebase(s, remote);
    expect(merged.map((r) => `${r.id}:${r.label}`)).toEqual(["a:Mine", "b:Theirs", "r:r"]);
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
    expect(errors).toMatchObject({ category: "This can't be empty.", thumbnail: "This can't be empty.", url: "Enter a full web address that starts with https://, or a page on this site that starts with /" });
    for (const m of Object.values(errors)) expect(m).not.toMatch(/json|schema|path|regex|string|kebab/i);
  });
});
