// @vitest-environment happy-dom
// Office theme writer (ENGINE_SPEC.md, section 7): the package unzips, every XML part is well-formed, the twelve
// colors and both fonts are in theme1.xml in slot order, and two builds of the same data are byte-identical.
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { OFFICE_COLOR_SLOTS } from "../schemas/brand.ts";
import { buildOfficeTheme, officeThemeFileName, type OfficeThemeInput } from "../src/office/index.ts";

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";

const theme = (): OfficeThemeInput => ({
  name: "Pocket Comet",
  colors: {
    dk1: "#1C2430", lt1: "#F7F6F2", dk2: "#1E5B4A", lt2: "#E4EFEA",
    accent1: "#1E5B4A", accent2: "#9A4A24", accent3: "#F5E6DA", accent4: "#59616C", accent5: "#E4EFEA", accent6: "#1C2430",
    hlink: "#1E5B4A", folHlink: "#59616C",
  },
  fonts: { major: "Fraunces", minor: "Inter" },
});

// happy-dom matches prefixed names by qualified name, so look elements up as "a:<name>".
const first = (from: Document | Element, name: string) => from.getElementsByTagName(`a:${name}`)[0]!;

const parse = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
};

describe("Office theme package", () => {
  const files = unzipSync(buildOfficeTheme(theme()));

  it("holds the theme, its manager, the relationships, and a PNG thumbnail", () => {
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml", "_rels/.rels", "docProps/thumbnail.png",
      "theme/theme/_rels/themeManager.xml.rels", "theme/theme/theme1.xml", "theme/theme/themeManager.xml",
    ]);
    expect([...files["docProps/thumbnail.png"]!.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("writes well-formed XML in every part", () => {
    for (const [name, bytes] of Object.entries(files)) if (!name.endsWith(".png")) parse(strFromU8(bytes));
  });

  it("names every part in the content types and relationships", () => {
    const types = strFromU8(files["[Content_Types].xml"]!);
    expect(types).toContain('PartName="/theme/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"');
    expect(types).toContain('PartName="/theme/theme/themeManager.xml" ContentType="application/vnd.openxmlformats-officedocument.themeManager+xml"');
    expect(strFromU8(files["_rels/.rels"]!)).toContain('Target="theme/theme/themeManager.xml"');
    expect(strFromU8(files["theme/theme/_rels/themeManager.xml.rels"]!)).toContain('Target="theme1.xml"');
  });

  it("sets the twelve colors in slot order, both fonts, and the theme name", () => {
    const doc = parse(strFromU8(files["theme/theme/theme1.xml"]!));
    const root = doc.documentElement;
    expect(root.namespaceURI).toBe(A);
    expect(root.getAttribute("name")).toBe("Pocket Comet");
    const scheme = first(doc, "clrScheme");
    const slots = [...scheme.children].map((el) => [el.localName, el.firstElementChild?.getAttribute("val")]);
    expect(slots).toEqual(OFFICE_COLOR_SLOTS.map((s) => [s, theme().colors[s].slice(1)]));
    const latin = (tag: string) => first(first(doc, tag), "latin").getAttribute("typeface");
    expect(latin("majorFont")).toBe("Fraunces");
    expect(latin("minorFont")).toBe("Inter");
    for (const list of ["fillStyleLst", "lnStyleLst", "effectStyleLst", "bgFillStyleLst"]) {
      expect(first(doc, list).children).toHaveLength(3);
    }
  });

  it("escapes the theme name", () => {
    const doc = parse(strFromU8(unzipSync(buildOfficeTheme({ ...theme(), name: 'Tea & "Toast" <Co>' }))["theme/theme/theme1.xml"]!));
    expect(doc.documentElement.getAttribute("name")).toBe('Tea & "Toast" <Co>');
  });

  it("builds byte-identical files from the same data", () => {
    expect(buildOfficeTheme(theme())).toEqual(buildOfficeTheme(theme()));
    expect(buildOfficeTheme({ ...theme(), fonts: { major: "Inter", minor: "Inter" } })).not.toEqual(buildOfficeTheme(theme()));
  });

  it("names the file from the theme name", () => {
    expect(officeThemeFileName("Pocket Comet")).toBe("pocket-comet-office-theme.thmx");
  });
});
