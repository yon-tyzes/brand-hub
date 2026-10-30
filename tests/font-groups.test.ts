// Font groups (ENGINE_SPEC.md, section 5, Font groups): brand.json modules.fonts.groups and each font's group.
import { describe, expect, it } from "vitest";
import { BrandDataError, loadBrand } from "../src/content/load.ts";
import { createSite } from "../src/site/data.ts";
import { demoCopy, edit } from "./helpers.ts";

const GROUPS = [{ id: "office", title: "For documents", help: "Install these on your computer." }, { id: "web", title: "For websites" }];

function problems(brandDir: string): string[] {
  try {
    loadBrand(brandDir);
  } catch (e) {
    expect(e).toBeInstanceOf(BrandDataError);
    return (e as BrandDataError).problems.map((p) => p.problem);
  }
  return [];
}

function siteFor(brandDir: string) {
  const c = loadBrand(brandDir);
  return createSite({
    brand: c.brand, config: { modules: ["fonts"], indexing: false, search: { shortcut: [] }, hero: { preset: "mesh" } }, engineVersion: "0.2.2",
    assets: c.assets, rules: c.rules, changelog: c.changelog, urlFor: (p) => `/${p}`, svgFor: () => undefined,
  });
}

describe("font groups", () => {
  it("lists groups in order with their fonts and zip, leaving out empty groups", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.modules = { ...b.modules, fonts: { groups: GROUPS } };
    });
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].group = "office";
    });
    const groups = siteFor(brandDir).fontGroups();
    expect(groups?.map((g) => [g.id, g.title, g.help, g.href, g.fonts.map((f) => f.id)])).toEqual([
      ["office", "For documents", "Install these on your computer.", "/downloads/fonts-office.zip", ["inter"]],
    ]);
  });

  it("is unchanged without groups", () => {
    expect(siteFor(demoCopy().brandDir).fontGroups()).toBeUndefined();
  });

  it("fails on an unknown group id and names the font", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.modules = { ...b.modules, fonts: { groups: GROUPS } };
    });
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].group = "print";
    });
    expect(problems(brandDir)).toEqual([expect.stringMatching(/^group: font "inter" names group "print", which is not in modules\.fonts\.groups .* Use one of: office, web$/)]);
  });

  it("fails on a font with no group once groups are set, and on a group without groups set", () => {
    const set = demoCopy().brandDir;
    edit(set, "brand.json", (b) => {
      b.modules = { ...b.modules, fonts: { groups: GROUPS } };
    });
    expect(problems(set)).toEqual([expect.stringMatching(/^group: font "inter" has no group\. modules\.fonts\.groups is set/)]);

    const unset = demoCopy().brandDir;
    edit(unset, "fonts.json", (fonts) => {
      fonts[0].group = "office";
    });
    expect(problems(unset)).toEqual([expect.stringMatching(/^group: font "inter" names group "office".*\(none listed\)$/)]);
  });

  it("rejects duplicate group ids", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b) => {
      b.modules = { ...b.modules, fonts: { groups: [GROUPS[0], GROUPS[0]] } };
    });
    expect(problems(brandDir)).toContain("modules.fonts.groups: group ids must be unique");
  });
});
