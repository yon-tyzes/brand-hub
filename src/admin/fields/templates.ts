import { canvaLinkWarning } from "../editor/links.ts";
import { suggest, type FieldDef } from "./types.ts";

export const templateFields: FieldDef[] = [
  { key: "category", kind: "text", label: "Category", help: "Templates are filtered by category, like Print, Slides, or Social.", suggestions: suggest("template", "category", ["Print", "Slides", "Social"]) },
  { key: "url", kind: "url", warn: canvaLinkWarning, label: "Template link", help: "In Canva, choose Share, then Template link. Templates without a link stay off the site.", optional: true },
  { key: "fallbackUrl", kind: "url", label: "Backup link", help: "Optional. A second place to get the template, like a PowerPoint file.", optional: true },
  { key: "thumbnail", kind: "file", accept: [".png", ".jpg", ".jpeg", ".webp", ".svg"], label: "Thumbnail", help: "An image of the template, shown on its card. A 4 by 3 image works best." },
  { key: "rules", kind: "records", types: ["rule"], label: "Template rules", help: "Rules shown on this template's card.", optional: true },
];
