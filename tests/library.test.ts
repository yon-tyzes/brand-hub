import { describe, expect, it } from "vitest";
import type { ColorAsset, LogoAsset } from "../schemas/asset.ts";
import type { ModuleId } from "../schemas/hub-config.ts";
import { loadBrand } from "../src/content/load.ts";
import { createSite } from "../src/site/data.ts";
import { colorPairs, colorRows, copiedMessage, defaultPairs, iconPairs, logoDownloads, ruleStrip, splitColors } from "../src/site/library.ts";
import { demoCopy } from "./helpers.ts";

function site(modules: ModuleId[] = ["colors", "guide"]) {
  const c = loadBrand(demoCopy().brandDir);
  return createSite({
    brand: c.brand, config: { modules, indexing: false, search: { shortcut: [] }, hero: { preset: "mesh" } }, engineVersion: "0.2.0",
    assets: c.assets, rules: c.rules, changelog: c.changelog, urlFor: (p) => `/files/${p}`, svgFor: () => undefined,
  });
}

const base = { status: "locked", version: "1.0", updated: "2026-10-23", audience: "public" } as const;
const color = (id: string, role: string, extra: Partial<ColorAsset> = {}): ColorAsset =>
  ({ ...base, id, label: id, type: "color", hex: "#1E5B4A", rgb: [30, 91, 74], role, pairings: [], ...extra }) as ColorAsset;

describe("downloads by use", () => {
  it("names logo files by use, PNG first, with PDF and EPS for vendors when present", () => {
    const logo = {
      ...base, id: "logo-horizontal", label: "Horizontal logo", type: "logo", lockup: "Horizontal", colorway: "Full color", background: "light",
      files: [
        { ext: "svg", path: "files/logos/h.svg" }, { ext: "png", path: "files/logos/h-600.png", width: 600 },
        { ext: "png", path: "files/logos/h-1200.png", width: 1200 }, { ext: "eps", path: "files/logos/h.eps" },
      ],
    } as LogoAsset;
    expect(logoDownloads(site(), logo).map((d) => [d.label, d.short, d.format, d.filename])).toEqual([
      ["For Word and PowerPoint", "For slides", "PNG", "h-1200.png"],
      ["For print and web", "For print", "SVG", "h.svg"],
      ["For sign makers", "For sign makers", "EPS", "h.eps"],
    ]);
  });
});

describe("color values by use", () => {
  it("labels rows Web, RGB, Print, and Sign, and hides rows with no value", () => {
    expect(colorRows(color("a", "primary", { cmyk: [67, 0, 19, 64], pms: "PMS 7484 C" })).map((r) => [r.use, r.value])).toEqual([
      ["Web", "#1E5B4A"], ["RGB", "30 91 74"], ["Print", "67 0 19 64"], ["Sign", "PMS 7484 C"],
    ]);
    expect(colorRows(color("b", "primary")).map((r) => r.use)).toEqual(["Web", "RGB"]);
    expect(copiedMessage("Comet Green", "#1E5B4A")).toBe("Comet Green #1E5B4A copied");
  });

  it("puts the first color of each core role in Main and the rest in Supporting", () => {
    const { main, supporting } = splitColors([
      color("green", "primary"), color("ink", "text"), color("white", "background"), color("copper", "accent"),
      color("slate", "secondary text"), color("mist", "background"), color("clay", "background"),
    ]);
    expect(main.map((c) => c.id)).toEqual(["green", "ink", "white", "copper"]);
    expect(supporting.map((c) => c.id)).toEqual(["slate", "mist", "clay"]);
  });

  it("lists each declared text-on-color pair once", () => {
    const white = color("white", "background", { pairings: [{ fg: "ink", bg: "white", use: "text" }] });
    const ink = color("ink", "text", { pairings: [{ fg: "white", bg: "ink", use: "text" }, { fg: "ink", bg: "white", use: "large-text" }] });
    expect(colorPairs([white, ink]).map((p) => p.key)).toEqual(["ink-on-white", "white-on-ink"]);
  });
});

describe("rules strip", () => {
  it("lists the titles of the rules that apply to a page, linking to the chapter", () => {
    const s = site();
    expect(ruleStrip(s, "colors", s.assetsOfType("color"))).toEqual({
      label: "Color rules",
      lines: ["Use Comet Green for one action per screen."],
      link: { href: "/guide/color-use/", label: "All color rules" },
    });
  });

  it("links to the chapter whose rule covers the most of the page's items", () => {
    const s = site();
    const colors = s.assetsOfType("color");
    const backgrounds = { ...s.rules[0]!, id: "backgrounds-rule", title: "Use light grounds", chapter: "backgrounds", appliesTo: [colors[1]!.id] };
    const withTwo = { ...s, rules: [backgrounds, ...s.rules] } as typeof s;
    expect(ruleStrip(withTwo, "colors", colors)?.link?.href).toBe("/guide/color-use/");
  });

  it("has no strip when no rule applies, and no link when the guide is off", () => {
    const s = site(["colors", "fonts"]);
    expect(ruleStrip(s, "fonts", s.assetsOfType("font"))).toBeUndefined();
    expect(ruleStrip(s, "colors", s.assetsOfType("color"))?.link).toBeUndefined();
  });
});

describe("icon color pairs", () => {
  const ink = color("ink", "text", { label: "Ink", hex: "#1C2430" });
  const green = color("comet-green", "primary", { label: "Comet Green", hex: "#1E5B4A" });
  const copper = color("copper", "accent", { label: "Copper", hex: "#9A4A24" });
  const white = color("kiln-white", "background", { label: "Kiln White", hex: "#F7F6F2" });
  const mist = color("mist", "background", { label: "Mist", hex: "#E4EFEA" });
  const palette = [green, ink, white, copper, mist];

  it("keeps only pairs at 3:1 or better, ordered by icon color, then ground", () => {
    const pairs = iconPairs(palette, { colors: ["ink", "comet-green", "copper", "kiln-white"], grounds: ["kiln-white", "ink", "comet-green"] });
    expect(pairs.map((p) => p.label)).toEqual([
      "Ink on Kiln White",
      "Comet Green on Kiln White",
      "Copper on Kiln White",
      "Kiln White on Ink",
      "Kiln White on Comet Green",
    ]);
    for (const p of pairs) expect(p.ratio).toBeGreaterThanOrEqual(3);
    // Copper on Ink is 2.5:1 and Ink on Comet Green 2:1: both left out.
    expect(pairs.find((p) => p.id === "copper-on-ink")).toBeUndefined();
    expect(pairs.find((p) => p.id === "ink-on-comet-green")).toBeUndefined();
  });

  it("uses the lightest and darkest colors as grounds by default", () => {
    const pairs = iconPairs(palette, { colors: ["comet-green", "kiln-white"] });
    expect(pairs.map((p) => p.id)).toEqual(["comet-green-on-kiln-white", "kiln-white-on-ink"]);
    expect(iconPairs(palette, { colors: ["ink"], grounds: [] }).map((p) => p.ground.id)).toEqual(["kiln-white"]);
  });

  it("labels the panel with the shell text value that reads on the ground", () => {
    const [onLight, onDark] = iconPairs(palette, { colors: ["comet-green", "kiln-white"] });
    expect(onLight).toMatchObject({ light: true, text: "#0b0d10" });
    expect(onDark).toMatchObject({ light: false, text: "#f2f3f5" });
  });

  it("opens light theme on the first light ground and dark theme on the first dark ground", () => {
    const d = defaultPairs(iconPairs(palette, { colors: ["ink", "comet-green", "copper", "kiln-white"], grounds: ["kiln-white", "ink", "comet-green"] }));
    expect(d.light?.id).toBe("ink-on-kiln-white");
    expect(d.dark?.id).toBe("kiln-white-on-ink");
  });

  it("skips ids that are not live colors and offers nothing without icon colors", () => {
    expect(iconPairs(palette, { colors: ["missing", "ink"], grounds: ["missing", "kiln-white"] }).map((p) => p.id)).toEqual(["ink-on-kiln-white"]);
    expect(iconPairs(palette, undefined)).toEqual([]);
  });
});
