// Office theme (.thmx) writer (spec section 7): an OOXML package with the brand's twelve theme colors, a heading
// and a body font, the standard Office format scheme, and a thumbnail drawn from the palette. Pure: no file
// system access, and the same input always gives the same bytes.
import { strToU8, zipSync } from "fflate";
import { OFFICE_COLOR_SLOTS } from "../../schemas/brand.ts";
import { palettePng } from "./thumbnail.ts";

export type OfficeColorSlot = (typeof OFFICE_COLOR_SLOTS)[number];

export interface OfficeThemeInput {
  /** Theme name inside Office. */
  name: string;
  /** Hex per slot, "#RRGGBB". */
  colors: Record<OfficeColorSlot, string>;
  /** Font family names: headings (major) and body (minor). */
  fonts: { major: string; minor: string };
}

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rgb = (hex: string) => hex.replace("#", "").toUpperCase();

/** File name for a theme: "Pocket Comet" becomes "pocket-comet-office-theme.thmx". */
export const officeThemeFileName = (themeName: string) =>
  `${themeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand"}-office-theme.thmx`;

const font = (tag: string, family: string) => `<a:${tag}><a:latin typeface="${esc(family)}"/><a:ea typeface=""/><a:cs typeface=""/></a:${tag}>`;

const phClr = (mods: Record<string, number>) =>
  `<a:schemeClr val="phClr">${Object.entries(mods).map(([k, v]) => `<a:${k} val="${v}"/>`).join("")}</a:schemeClr>`;
const grad = (stops: Record<string, number>[]) =>
  `<a:gradFill rotWithShape="1"><a:gsLst>${stops.map((m, i) => `<a:gs pos="${i * 50000}">${phClr(m)}</a:gs>`).join("")}</a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`;
const line = (w: number) =>
  `<a:ln w="${w}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>`;

/** The format scheme Office ships with its default theme: fills, lines, effects, and background fills. */
const FORMAT_SCHEME = [
  '<a:fmtScheme name="Office">',
  "<a:fillStyleLst>",
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>',
  grad([{ lumMod: 110000, satMod: 105000, tint: 67000 }, { lumMod: 105000, satMod: 103000, tint: 73000 }, { lumMod: 105000, satMod: 109000, tint: 81000 }]),
  grad([{ satMod: 103000, lumMod: 102000, tint: 94000 }, { satMod: 110000, lumMod: 100000, shade: 100000 }, { lumMod: 99000, satMod: 120000, shade: 78000 }]),
  "</a:fillStyleLst>",
  `<a:lnStyleLst>${line(6350)}${line(12700)}${line(19050)}</a:lnStyleLst>`,
  "<a:effectStyleLst>",
  "<a:effectStyle><a:effectLst/></a:effectStyle>",
  "<a:effectStyle><a:effectLst/></a:effectStyle>",
  '<a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>',
  "</a:effectStyleLst>",
  "<a:bgFillStyleLst>",
  '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>',
  `<a:solidFill>${phClr({ tint: 95000, satMod: 170000 })}</a:solidFill>`,
  grad([{ tint: 93000, satMod: 150000, shade: 98000, lumMod: 102000 }, { tint: 98000, satMod: 130000, shade: 90000, lumMod: 103000 }, { shade: 63000, satMod: 120000 }]),
  "</a:bgFillStyleLst>",
  "</a:fmtScheme>",
].join("");

/** theme1.xml: the color scheme, font scheme, and format scheme. */
export function themeXml(t: OfficeThemeInput): string {
  const name = esc(t.name);
  const colors = OFFICE_COLOR_SLOTS.map((s) => `<a:${s}><a:srgbClr val="${rgb(t.colors[s])}"/></a:${s}>`).join("");
  return (
    XML_HEAD +
    `<a:theme xmlns:a="${A}" name="${name}"><a:themeElements>` +
    `<a:clrScheme name="${name}">${colors}</a:clrScheme>` +
    `<a:fontScheme name="${name}">${font("majorFont", t.fonts.major)}${font("minorFont", t.fonts.minor)}</a:fontScheme>` +
    FORMAT_SCHEME +
    "</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>"
  );
}

const CONTENT_TYPES =
  XML_HEAD +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Default Extension="png" ContentType="image/png"/>' +
  '<Override PartName="/theme/theme/themeManager.xml" ContentType="application/vnd.openxmlformats-officedocument.themeManager+xml"/>' +
  '<Override PartName="/theme/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
  "</Types>";

const ROOT_RELS =
  XML_HEAD +
  `<Relationships xmlns="${PKG_REL}">` +
  `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="theme/theme/themeManager.xml"/>` +
  `<Relationship Id="rId2" Type="${PKG_REL}/metadata/thumbnail" Target="docProps/thumbnail.png"/>` +
  "</Relationships>";

const THEME_MANAGER = XML_HEAD + `<a:themeManager xmlns:a="${A}"/>`;

const THEME_MANAGER_RELS =
  XML_HEAD + `<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/theme" Target="theme1.xml"/></Relationships>`;

// Fixed timestamp so identical inputs build identical files, as with the other downloads.
const MTIME = new Date("2000-01-01T00:00:00Z");

/** The .thmx package. Byte-identical for the same input. */
export function buildOfficeTheme(t: OfficeThemeInput): Uint8Array {
  return zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES),
      "_rels/.rels": strToU8(ROOT_RELS),
      "docProps/thumbnail.png": [palettePng(t.colors), { level: 0 }],
      "theme/theme/themeManager.xml": strToU8(THEME_MANAGER),
      "theme/theme/theme1.xml": strToU8(themeXml(t)),
      "theme/theme/_rels/themeManager.xml.rels": strToU8(THEME_MANAGER_RELS),
    },
    { level: 6, mtime: MTIME },
  );
}
