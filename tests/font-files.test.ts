// Font files (ENGINE_SPEC.md, section 5, Font files): web[] for the site only, downloads from static[] and
// variable[], and the warning for fonts Word cannot install.
import { describe, expect, it } from "vitest";
import { loadBrand } from "../src/content/load.ts";
import { fontZips } from "../src/site/data.ts";
import { demoCopy, edit } from "./helpers.ts";

const INTER = "files/fonts/inter/inter-latin";

describe("font files", () => {
  it("warns about a font with only WOFF2 files, naming it", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].files = { static: [`${INTER}-400-normal.woff2`], variable: [] };
    });
    expect(loadBrand(brandDir).warnings.map((w) => [w.id, w.field, w.problem])).toEqual([["inter", "files", 'font "inter" has only WOFF2 files, so it cannot be installed in Word']]);
  });

  it("warns when the WOFF2 files sit in web[] and nothing installs", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].files = { static: [], variable: [`${INTER}-400-normal.woff2`], web: [`${INTER}-500-normal.woff2`] };
    });
    expect(loadBrand(brandDir).warnings.map((w) => w.id)).toEqual(["inter"]);
  });

  it("does not warn with static TTF files, and keeps web[] out of every zip", () => {
    const c = loadBrand(demoCopy().brandDir);
    expect(c.warnings).toEqual([]);
    const font = c.assets.find((a) => a.type === "font")!;
    expect(font.type === "font" && fontZips(font).flatMap((z) => z.files)).toEqual(["400", "500", "600"].map((w) => `files/fonts/inter/inter-${w}.ttf`));
  });

  it("fails on a web file that is not WOFF2 or does not exist", () => {
    const { brandDir } = demoCopy();
    edit(brandDir, "fonts.json", (fonts) => {
      fonts[0].files.web = ["files/fonts/inter/missing.woff2", "files/fonts/inter/OFL.txt"];
    });
    expect(() => loadBrand(brandDir)).toThrow(/files\.web\.1: must point to a \.woff2 file/);
  });
});
