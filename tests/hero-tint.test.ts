import { describe, expect, it } from "vitest";
import { contrastRatio, hexToOklch, hexToRgb } from "../src/theme/color.ts";
import { CHROMA_RANGE, heroCss, heroTones, NEUTRAL, NEUTRAL_SHADOW, SHADOW, SHELL_COLORS, TONES } from "../src/theme/index.ts";

/** Each channel within `tolerance` of the expected color. */
function expectClose(actual: string[], expected: string[], tolerance = 1) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((hex, i) => {
    const a = hexToRgb(hex);
    const e = hexToRgb(expected[i]!);
    a.forEach((v, ch) => expect(Math.abs(v - e[ch]!), `${hex} vs ${expected[i]} channel ${ch}`).toBeLessThanOrEqual(tolerance));
  });
}

const DEMO_PALETTE = ["#1E5B4A", "#1C2430", "#F7F6F2", "#B4643C", "#59616C", "#E6ECE8", "#EADFD3"];

describe("heroTones", () => {
  it("tunes the demo primary into three pale tones", () => {
    const t = heroTones({ primary: "#1E5B4A", palette: DEMO_PALETTE });
    expect(t.source).toBe("primary");
    expectClose(t.light, ["#c2dfd4", "#cbecf0", "#def2dd"]);
  });

  it("sets each tone's lightness and hue and keeps chroma in range", () => {
    const { h } = hexToOklch("#1E5B4A");
    heroTones({ primary: "#1E5B4A", palette: [] }).light.forEach((hex, i) => {
      const c = hexToOklch(hex);
      expect(c.l).toBeCloseTo(TONES[i]!.l, 2);
      expect(c.c).toBeGreaterThanOrEqual(CHROMA_RANGE.min - 0.002);
      expect(c.c).toBeLessThanOrEqual(CHROMA_RANGE.max + 0.002);
      expect(Math.abs(((c.h - (h + TONES[i]!.hueShift) + 540) % 360) - 180)).toBeLessThan(3);
    });
  });

  it("caps chroma for a loud primary", () => {
    for (const hex of heroTones({ primary: "#FF0000", palette: [] }).light) expect(hexToOklch(hex).c).toBeLessThanOrEqual(CHROMA_RANGE.max + 0.002);
  });

  it("takes the most saturated palette color when the primary is nearly neutral", () => {
    const fromPalette = heroTones({ primary: "#333333", palette: ["#F7F6F2", "#B4643C", "#1E5B4A"] });
    expect(fromPalette.source).toBe("palette");
    expect(fromPalette.light).toEqual(heroTones({ primary: "#B4643C", palette: [] }).light);
  });

  it("gives a black and white palette the cool neutral", () => {
    const t = heroTones({ primary: "#000000", palette: ["#000000", "#FFFFFF", "#808080"] });
    expect(t.source).toBe("neutral");
    for (const hex of t.light) {
      const c = hexToOklch(hex);
      expect(c.c).toBeLessThan(0.03);
      expect(Math.abs(c.h - NEUTRAL.hue)).toBeLessThan(10);
    }
  });

  it("lets hero.tint win over the tuning", () => {
    const t = heroTones({ primary: "#1E5B4A", palette: DEMO_PALETTE, tint: ["#F2E8DC", "#E4EEF4", "#EAF2E4"] });
    expect(t.source).toBe("tint");
    expect(t.light).toEqual(["#f2e8dc", "#e4eef4", "#eaf2e4"]);
  });

  it("moves each tone toward the dark background in dark theme", () => {
    const t = heroTones({ primary: "#1E5B4A", palette: [] });
    const bg = hexToOklch(SHELL_COLORS.bg.dark).l;
    t.dark.forEach((hex, i) => {
      const light = hexToOklch(t.light[i]!).l;
      const dark = hexToOklch(hex).l;
      expect(dark).toBeLessThan(light);
      // About 60% of the way: 35% to 45% of the background's lightness gap is left, so the hue still shows.
      expect(dark - bg).toBeLessThan((light - bg) * 0.45);
      expect(dark - bg).toBeGreaterThan((light - bg) * 0.35);
    });
  });

  it("keeps the hero text readable over the brightest dark tone", () => {
    const t = heroTones({ primary: "#1E5B4A", palette: DEMO_PALETTE });
    for (const hex of t.dark) expect(contrastRatio(SHELL_COLORS.text.dark, hex)).toBeGreaterThanOrEqual(4.5);
  });

  it("builds the glass shadow from the hue at lightness 0.45 and chroma 0.08, at 28% alpha", () => {
    const t = heroTones({ primary: "#1E5B4A", palette: [] });
    const m = /^rgb\((\d+) (\d+) (\d+) \/ 0\.28\)$/.exec(t.shadow);
    expect(m).not.toBeNull();
    const hex = "#" + m!.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, "0")).join("");
    const c = hexToOklch(hex);
    expect(c.l).toBeCloseTo(SHADOW.l, 2);
    expect(c.c).toBeCloseTo(SHADOW.c, 2);
    expect(Math.abs(c.h - hexToOklch("#1E5B4A").h)).toBeLessThan(3);
    expect(heroCss(t)).toContain(`--hero-shadow: ${t.shadow};`);
  });

  it("gives the neutral fallback a plain shadow", () => {
    expect(heroTones({ primary: "#000000", palette: ["#FFFFFF"] }).shadow).toBe(NEUTRAL_SHADOW);
    expect(NEUTRAL_SHADOW).toBe("rgba(11, 13, 16, 0.16)");
  });
});
