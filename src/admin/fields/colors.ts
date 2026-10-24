import { suggest, type FieldDef } from "./types.ts";

import { helpField } from "./types.ts";

/** In the order of EditorColors.dc.html: the values by use, then where the color is used. */
export const colorFields: FieldDef[] = [
  { key: "hex", kind: "color", label: "Web (HEX)", help: "RGB fills in from this." },
  { key: "cmyk", kind: "cmyk", label: "Print (CMYK)", help: "", optional: true },
  { key: "pms", kind: "text", label: "Sign (PMS)", help: "", optional: true, placeholder: "PMS 0000 C" },
  helpField,
  { key: "role", kind: "text", label: "Role", help: "What the color is for, like Primary, Text, Background, or Accent.", suggestions: suggest("color", "role", ["Primary", "Text", "Background", "Accent"]) },
  { key: "pairings", kind: "pairings", label: "Approved pairings", help: "Text and background combinations people may use. Each shows its contrast so you can check it is readable.", optional: true },
];
