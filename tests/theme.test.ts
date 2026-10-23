import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brand as brandSchema } from "../schemas/brand.ts";
import { BrandDataError, loadBrand } from "../src/content/load.ts";
import {
  buildThemeCss, checkPairingContrast, checkTokenContrast, contrastRatio, formatContrastFailure, mix, resolveColors,
} from "../src/theme/index.ts";
import { demoCopy, edit } from "./helpers.ts";

const demo = brandSchema.parse(JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "brand", "brand.json"), "utf8")));

describe("color math", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#FFFFFF", "#767676")).toBe(contrastRatio("#767676", "#FFFFFF"));
  });

  it("mixes in OKLab like CSS color-mix", () => {
    expect(mix("#FFFFFF", "#000000", 0.5)).toBe("#636363");
    expect(mix("#1E5B4A", "#FFFFFF", 0)).toBe("#1E5B4A");
  });

  it("derives colors a brand does not set and keeps ones it does", () => {
    const c = resolveColors({ ...demo.tokens.color, focus: "#000000" });
    expect(c.onPrimary).toBe(demo.tokens.color.surface);
    expect(c.focus).toBe("#000000");
    expect(c.surface2).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("contrast check", () => {
  it("passes the demo tokens in light and dark", () => {
    expect(checkTokenContrast(demo.tokens)).toEqual([]);
  });

  it("fails muted text under 4.5:1 and names the pair", () => {
    const failures = checkTokenContrast({ ...demo.tokens, color: { ...demo.tokens.color, muted: "#9A9AA0" } });
    expect(failures.map((f) => `${f.scope} ${f.fg}/${f.bg}`)).toEqual(["light muted/bg", "light muted/surface", "light muted/surface2"]);
    expect(formatContrastFailure(failures[0]!)).toMatch(/^light: muted #9A9AA0 on bg #F7F6F2 is 2\.\d\d:1, needs 4\.5:1$/);
  });

  it("checks the dark theme too", () => {
    const dark = { ...demo.tokens.dark!, link: "#2B4A66" };
    const failures = checkTokenContrast({ ...demo.tokens, dark });
    expect(failures.map((f) => `${f.scope} ${f.fg}/${f.bg}`)).toEqual(["dark link/bg", "dark link/surface", "dark focus/bg", "dark focus/surface"]);
  });

  it("uses 3:1 for large text and graphics, 4.5:1 for text", () => {
    const base = { type: "color", status: "locked", version: "1.0", updated: "2026-10-22", audience: "public", role: "x" } as const;
    const grey = { ...base, id: "grey", label: "Grey", hex: "#808080", rgb: [128, 128, 128] as [number, number, number], pairings: [] };
    const white = {
      ...base, id: "white", label: "White", hex: "#FFFFFF", rgb: [255, 255, 255] as [number, number, number],
      pairings: [{ fg: "grey", bg: "white", use: "large-text" as const }, { fg: "grey", bg: "white", use: "text" as const }],
    };
    const failures = checkPairingContrast([grey, white]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ fg: "grey", bg: "white", min: 4.5 });
  });

  it("fails the build when a declared pairing is under AA", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (colors) => {
      colors[1].hex = "#8FA89F";
      colors[1].rgb = [143, 168, 159];
    });
    let error: unknown;
    try {
      loadBrand(brandDir);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BrandDataError);
    const problems = (error as BrandDataError).problems.map((p) => p.problem);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^contrast color assets \(comet-green\): kiln-white #8FA89F on comet-green #1E5B4A is \d\.\d\d:1, needs 4\.5:1$/);
  });

  it("fails the build when theme tokens are under AA", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.tokens.color.text = "#B0B0B0";
    });
    expect(() => loadBrand(brandDir)).toThrow(/brand\.json: contrast light: text #B0B0B0 on bg #F7F6F2/);
  });
});

describe("buildThemeCss", () => {
  const css = buildThemeCss(demo.tokens);

  it("writes light tokens on :root and dark tokens under data-theme", () => {
    expect(css).toContain("--color-primary: #1E5B4A;");
    expect(css).toContain("--color-surface-2: ");
    expect(css).toContain("--space-9: 96px;");
    expect(css).toContain("--radius-control: 999px;");
    expect(css).toContain('--font-display: "Inter", ');
    expect(css).toMatch(/:root\[data-theme="dark"\] \{\n {2}color-scheme: dark;\n {2}--color-bg: #111518;/);
  });

  it("scales type steps with the ratio at each breakpoint", () => {
    expect(css.match(/--step-7: [\d.]+rem/g)).toEqual(["--step-7: 2.28rem", "--step-7: 2.66rem", "--step-7: 3.58rem"]);
    expect(css).toContain("@media (min-width: 480px)");
    expect(css).toContain("@media (min-width: 992px)");
  });

  it("omits the dark block when the brand has no dark tokens", () => {
    const { dark: _dark, ...light } = demo.tokens;
    expect(buildThemeCss(light)).not.toContain("data-theme");
  });
});
