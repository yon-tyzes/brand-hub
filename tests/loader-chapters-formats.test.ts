import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BrandDataError, formatWarning, loadBrand } from "../src/content/load.ts";
import { demoCopy, edit } from "./helpers.ts";

function loadError(brandDir: string): BrandDataError {
  try {
    loadBrand(brandDir);
  } catch (e) {
    expect(e).toBeInstanceOf(BrandDataError);
    return e as BrandDataError;
  }
  throw new Error("expected loadBrand to throw");
}

const template = (over: Record<string, unknown> = {}) => ({
  id: "template-letterhead",
  label: "Letterhead",
  status: "locked",
  version: "1.0",
  updated: "2026-10-23",
  audience: "public",
  type: "template",
  category: "Print",
  thumbnail: "files/icons/check.svg",
  ...over,
});

/** Writes templates.json and a PDF the templates can point to. */
function withTemplates(brandDir: string, templates: object[]) {
  mkdirSync(join(brandDir, "files", "templates"), { recursive: true });
  writeFileSync(join(brandDir, "files", "templates", "letterhead.pdf"), "%PDF-1.7\n");
  writeFileSync(join(brandDir, "templates.json"), JSON.stringify(templates, null, 2));
}

describe("guide chapters", () => {
  it("fails on a rule whose chapter is not in guide.chapters, and names the fix", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "rules.json", (rules) => {
      rules[0].chapter = "colour-use";
    });
    const [p, ...rest] = loadError(brandDir).problems;
    expect(rest).toEqual([]);
    expect(p).toMatchObject({ id: "one-green-action", code: "reference", field: "chapter", ref: "colour-use" });
    expect(p!.problem).toMatch(/^chapter: "colour-use" is not in guide\.chapters in .*brand\.json\. Add it there or use one of: color-use$/);
  });

  it("fails on a rule with no chapter", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "rules.json", (rules) => {
      delete rules[0].chapter;
    });
    expect(loadError(brandDir).problems).toEqual([expect.objectContaining({ id: "one-green-action", field: "chapter", code: "schema" })]);
  });
});

describe("template formats", () => {
  it("loads a template with only a PDF and checks the file exists", () => {
    const { brandDir } = demoCopy();
    withTemplates(brandDir, [template({ formats: { pdf: "files/templates/letterhead.pdf" } })]);
    expect(loadBrand(brandDir).warnings).toEqual([]);

    withTemplates(brandDir, [template({ formats: { pdf: "files/templates/missing.pdf" } })]);
    expect(loadError(brandDir).problems).toEqual([expect.objectContaining({ code: "file-not-found", field: "formats", ref: "files/templates/missing.pdf" })]);
  });

  it("fails on a template with no format", () => {
    const { brandDir } = demoCopy();
    withTemplates(brandDir, [template({ formats: {} })]);
    expect(loadError(brandDir).problems).toEqual([
      expect.objectContaining({ id: "template-letterhead", field: "formats", problem: "formats: needs at least one of canva, docx, pptx, or pdf" }),
    ]);
  });

  it("rejects a format file of the wrong type", () => {
    const { brandDir } = demoCopy();
    withTemplates(brandDir, [template({ formats: { docx: "files/templates/letterhead.pdf" } })]);
    expect(loadError(brandDir).problems[0]!.problem).toBe("[0].formats.docx: must point to a .docx file");
  });
});

describe("quick downloads", () => {
  it("fails on an id that does not exist", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.quickDownloads = ["comet-green", "logo-ghost"];
    });
    expect(loadError(brandDir).problems.map((p) => p.problem)).toEqual(['quickDownloads: asset "logo-ghost" does not exist']);
  });

  it("fails on an id that is a rule", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.quickDownloads = ["one-green-action"];
    });
    expect(loadError(brandDir).problems.map((p) => p.problem)).toEqual(['quickDownloads: asset "one-green-action" does not exist']);
  });

  it("fails on an asset that is not locked, and names the fix", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[0].status = "draft";
    });
    edit(brandDir, "brand.json", (b) => {
      b.quickDownloads = ["comet-green"];
    });
    expect(loadError(brandDir).problems).toEqual([
      expect.objectContaining({
        field: "quickDownloads",
        ref: "comet-green",
        problem: 'quickDownloads: asset "comet-green" is draft, only locked assets show on the site. Lock it or remove it from quickDownloads',
      }),
    ]);
  });
});

describe("0.1 data warnings", () => {
  it("has no warnings for 0.2 data", () => {
    const { brandDir } = demoCopy();
    expect(loadBrand(brandDir).warnings).toEqual([]);
  });

  it("ignores the 0.1 shell tokens and keeps the primary color", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.tokens = {
        color: { bg: "#F7F6F2", text: "#1C2430", primary: "#1E5B4A" },
        dark: { bg: "#111518" },
        font: { display: "Inter", body: "Inter" },
        radius: { sm: 6, md: 10, lg: 16 },
        space: [4, 8, 12, 16, 24, 32, 48, 64, 96],
      };
    });
    const c = loadBrand(brandDir);
    expect(c.brand.tokens).toEqual({ color: { primary: "#1E5B4A" } });
    expect(c.warnings.map((w) => w.field)).toEqual(["tokens.color.bg, tokens.color.text", "tokens.font", "tokens.radius", "tokens.space", "tokens.dark"]);
    expect(formatWarning(c.warnings[0]!)).toMatch(
      /brand\.json: tokens\.color\.bg, tokens\.color\.text: ignored, the engine owns the shell colors\. Remove these keys and keep only tokens\.color\.primary\.$/,
    );
    expect(formatWarning(c.warnings[1]!)).toMatch(/brand\.json: tokens\.font: ignored, the engine owns the shell\. Remove tokens\.font\.$/);
  });

  it("reads topTasks as quickDownloads", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.topTasks = ["comet-green"];
    });
    const c = loadBrand(brandDir);
    expect(c.brand.quickDownloads).toEqual(["comet-green"]);
    expect(c.warnings).toHaveLength(1);
    expect(formatWarning(c.warnings[0]!)).toMatch(/brand\.json: topTasks: read as quickDownloads\. Rename topTasks to quickDownloads\.$/);
  });

  it("ignores topTasks when quickDownloads is set", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.topTasks = ["inter"];
      b.quickDownloads = ["comet-green"];
    });
    const c = loadBrand(brandDir);
    expect(c.brand.quickDownloads).toEqual(["comet-green"]);
    expect(formatWarning(c.warnings[0]!)).toMatch(/brand\.json: topTasks: ignored, quickDownloads is set\. Remove topTasks\.$/);
  });

  it("checks topTasks read as quickDownloads like quickDownloads", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.topTasks = ["logo-ghost"];
    });
    expect(loadError(brandDir).problems.map((p) => p.problem)).toEqual(['quickDownloads: asset "logo-ghost" does not exist']);
  });

  it("reads a template's 0.1 url as one link, counts it as a format, and drops fallbackUrl", () => {
    const { brandDir } = demoCopy();
    withTemplates(brandDir, [template({ url: "https://www.canva.com/design/abc/view", fallbackUrl: "https://example.com/letterhead.docx" })]);
    const c = loadBrand(brandDir);
    const t = c.assets.find((a) => a.id === "template-letterhead");
    expect(t).toMatchObject({ url: "https://www.canva.com/design/abc/view", formats: {} });
    expect(t).not.toHaveProperty("fallbackUrl");
    expect(c.warnings.map(formatWarning)).toEqual([
      expect.stringMatching(/templates\.json {2}id "template-letterhead": fallbackUrl: ignored\. Add the file as formats\.docx, formats\.pptx, or formats\.pdf, then remove fallbackUrl\.$/),
      expect.stringMatching(/templates\.json {2}id "template-letterhead": url: read as a single "Open template" link\. Move it to formats\.canva .*then remove url\.$/),
    ]);
  });
});
