import { describe, expect, it } from "vitest";
import { BrandDataError, loadBrand } from "../src/content/load.ts";
import { buildThemeCss, checkPairingContrast, checkShellContrast, contrastRatio, mix } from "../src/theme/index.ts";
import { demoCopy, edit } from "./helpers.ts";

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
});

describe("contrast check", () => {
  it("passes the shell tokens in light and dark", () => {
    expect(checkShellContrast("light")).toEqual([]);
    expect(checkShellContrast("dark")).toEqual([]);
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
});

describe("buildThemeCss", () => {
  const css = buildThemeCss();

  it("writes the shell tokens on :root in light", () => {
    expect(css).toMatch(/^:root \{\n {2}color-scheme: light;/);
    expect(css).toContain("--bg: #ffffff;");
    expect(css).toContain("--font-sans: \"Mona Sans\", system-ui, sans-serif;");
    expect(css).toContain("--sidebar-w: 248px;");
    expect(css).toContain("--h1-size: 32px;");
    expect(css).toContain("--glass-blur: 14px;");
  });

  it("applies dark from the system setting unless light is chosen, and from the toggle", () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme="light"\]\) \{\n {4}color-scheme: dark;\n {4}--bg: #0a0b0d;/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{\n {2}color-scheme: dark;\n {2}--bg: #0a0b0d;/);
  });

  it("sets gutters at 768 and 992", () => {
    expect(css).toMatch(/@media \(min-width: 768px\) \{\n {2}:root \{\n {4}--gutter: var\(--space-5\);/);
    expect(css).toMatch(/@media \(min-width: 992px\) \{\n {2}:root \{\n {4}--gutter: var\(--space-8\);/);
  });

  it("has no 0.1 variable names left", () => {
    expect(css).not.toMatch(/--(color-|step-|leading-|tracking-|font-body|font-display|weight-|radius-control|header-offset|preview-)/);
  });
});
