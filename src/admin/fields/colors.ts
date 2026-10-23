import { suggest, type FieldDef } from "./types.ts";

export const colorFields: FieldDef[] = [
  { key: "hex", kind: "color", label: "Hex", help: "Six characters after the #, like #1E5B4A. RGB updates on its own." },
  { key: "role", kind: "text", label: "Role", help: "What the color is for, like Primary, Text, Background, or Accent.", suggestions: suggest("color", "role", ["Primary", "Text", "Background", "Accent"]) },
  { key: "cmyk", kind: "cmyk", label: "CMYK", help: "For print. Four numbers from 0 to 100. Leave empty if print does not use this color.", optional: true },
  { key: "pms", kind: "text", label: "Pantone", help: "The Pantone match for print, like PMS 7484 C.", optional: true },
  { key: "pairings", kind: "pairings", label: "Approved pairings", help: "Text and background combinations people may use. Each shows its contrast so you can check it is readable.", optional: true },
];
