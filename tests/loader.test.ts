import { describe, expect, it } from "vitest";
import { BrandDataError, loadBrand } from "../src/content/load.ts";
import { demoCopy, edit, write } from "./helpers.ts";

/** Runs the loader and returns the error it throws. Fails the test if it does not throw. */
function loadError(brandDir: string): BrandDataError {
  try {
    loadBrand(brandDir);
  } catch (e) {
    expect(e).toBeInstanceOf(BrandDataError);
    return e as BrandDataError;
  }
  throw new Error("expected loadBrand to throw");
}

describe("loadBrand with valid data", () => {
  it("loads the demo brand", () => {
    const { brandDir } = demoCopy();
    const c = loadBrand(brandDir);
    expect(c.brand.name).toBe("Pocket Comet Teapots");
    expect(c.assets.map((a) => a.type).sort()).toEqual(["color", "color", "font", "icon", "icon", "icon", "icon", "icon"]);
    expect(c.rules.map((r) => r.id)).toEqual(["one-green-action"]);
    expect(c.pending).toEqual([]);
  });

  it("returns only locked items to public pages and pending items separately", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "icons.json", (icons) => {
      icons[0].status = "pending";
      icons[1].status = "draft";
      icons[2].status = "retired";
    });
    const c = loadBrand(brandDir);
    expect(c.assets.filter((a) => a.type === "icon").map((a) => a.id)).toEqual(["icon-check", "icon-arrow-right"]);
    expect(c.pending.map((a) => a.id)).toEqual(["icon-search"]);
    expect(c.all).toHaveLength(9);
  });

  it("accepts records split across assets.json and per-module files", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "icons.json", (icons) => {
      write(brandDir, "assets.json", JSON.stringify(icons.slice(3)));
      return icons.slice(0, 3);
    });
    expect(loadBrand(brandDir).assets.filter((a) => a.type === "icon")).toHaveLength(5);
  });
});

describe("loadBrand integrity failures", () => {
  it("reports a duplicate id with both files", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "icons.json", (icons) => {
      icons[0].id = "comet-green";
    });
    const e = loadError(brandDir);
    expect(e.problems).toHaveLength(1);
    expect(e.problems[0]).toMatchObject({ id: "comet-green" });
    expect(e.problems[0]!.problem).toMatch(/^duplicate id, already used in .*colors\.json$/);
  });

  it("reports a governedBy id that is not a rule", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[0].governedBy = ["no-such-rule"];
    });
    const e = loadError(brandDir);
    expect(e.problems).toEqual([
      expect.objectContaining({ id: "comet-green", problem: 'governedBy: rule "no-such-rule" does not exist' }),
    ]);
    expect(e.problems[0]!.file).toMatch(/brands\/demo\/colors\.json$/);
  });

  it("reports an appliesTo id that is not an asset", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "rules.json", (rules) => {
      rules[0].appliesTo.push("ghost-logo");
    });
    expect(loadError(brandDir).problems).toEqual([
      expect.objectContaining({ id: "one-green-action", problem: 'appliesTo: asset "ghost-logo" does not exist' }),
    ]);
  });

  it("reports a template rule and a color pairing that do not exist", () => {
    const { brandDir } = demoCopy();
    write(brandDir, "templates.json", JSON.stringify([{
      id: "letterhead", type: "template", label: "Letterhead", status: "locked", version: "1.0",
      updated: "2026-10-22", audience: "internal", category: "Print", url: "https://example.com/letterhead",
      thumbnail: "files/icons/copy.svg", rules: ["missing-rule"],
    }]));
    edit(brandDir, "colors.json", (colors) => {
      colors[0].pairings.push({ fg: "night-blue", bg: "comet-green" });
    });
    const problems = loadError(brandDir).problems.map((p) => `${p.id}: ${p.problem}`);
    expect(problems).toEqual([
      'comet-green: pairings.fg: color "night-blue" does not exist',
      'letterhead: rules: rule "missing-rule" does not exist',
    ]);
  });

  it("reports brand.json top tasks and icon colors that do not exist", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.topTasks = ["comet-green", "ghost-logo"];
      b.modules = { icons: { colors: ["comet-green", "icon-search"] } };
    });
    expect(loadError(brandDir).problems.map((p) => p.problem)).toEqual([
      'topTasks: asset "ghost-logo" does not exist',
      'modules.icons.colors: color "icon-search" does not exist',
    ]);
  });

  it("reports a file path that does not exist on disk", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].files.static[1] = "files/fonts/inter/missing.woff2";
    });
    const e = loadError(brandDir);
    expect(e.problems).toHaveLength(1);
    expect(e.problems[0]).toMatchObject({ id: "inter" });
    expect(e.problems[0]!.problem).toMatch(/^files\.static\.1: file not found: .*brands\/demo\/files\/fonts\/inter\/missing\.woff2$/);
  });

  it("reports schema errors with the item index, id, and field", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[1].hex = "#FFF";
    });
    const e = loadError(brandDir);
    expect(e.problems).toEqual([
      expect.objectContaining({ id: "kiln-white", problem: "[1].hex: must be a 6-digit hex color like #0F3D6B" }),
    ]);
  });

  it("reports rgb that does not match hex", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[0].rgb = [0, 0, 0];
    });
    expect(loadError(brandDir).problems[0]!.problem).toBe("[0].rgb: rgb does not match hex");
  });

  it("reports a record in the wrong split file", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "icons.json", (icons) => {
      edit(brandDir, "colors.json", (colors) => {
        colors.push(icons.pop());
      });
      return icons;
    });
    expect(loadError(brandDir).problems[0]!.problem).toBe('type "icon" does not belong in colors.json (expects "color")');
  });

  it("reports invalid JSON and a missing brand.json", () => {
    const { brandDir } = demoCopy();
    write(brandDir, "rules.json", "[{");
    write(brandDir, "brand.json", "");
    const problems = loadError(brandDir).problems.map((p) => p.problem);
    expect(problems).toHaveLength(2);
    expect(problems.every((p) => p.startsWith("invalid JSON"))).toBe(true);
  });

  it("lists every problem in one readable message", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[0].governedBy = ["no-such-rule"];
    });
    edit(brandDir, "icons.json", (icons) => {
      icons[3].svgPath = "files/icons/missing.svg";
    });
    const { message } = loadError(brandDir);
    expect(message).toMatch(/^Brand data in .*brands\/demo has 2 problems:\n/);
    expect(message).toContain('colors.json  id "comet-green": governedBy: rule "no-such-rule" does not exist');
    expect(message).toMatch(/icons\.json {2}id "icon-check": svgPath: file not found: .*missing\.svg/);
  });
});
