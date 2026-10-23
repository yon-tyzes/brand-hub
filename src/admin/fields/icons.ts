import { suggest, type FieldDef } from "./types.ts";

export const iconFields: FieldDef[] = [
  { key: "svgPath", kind: "file", accept: [".svg"], icon: true, label: "Icon file", help: "An SVG file. Colors are set to follow the color people pick on the site." },
  { key: "group", kind: "text", label: "Group", help: "Icons are listed by group on the site, like Interface or Tea.", suggestions: suggest("icon", "group") },
  { key: "pinned", kind: "toggle", onLabel: "Show in the pinned set at the top", label: "Pinned", help: "Pinned icons appear first on the Icons page." },
  { key: "source", kind: "text", label: "Source", help: "Where the icon came from, like the design team or an icon set." },
];
