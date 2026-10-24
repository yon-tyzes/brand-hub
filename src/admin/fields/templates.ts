import { canvaLinkWarning } from "../editor/links.ts";
import { suggest, type FieldDef } from "./types.ts";

export const templateFields: FieldDef[] = [
  { key: "category", kind: "text", label: "Category", help: "Templates are filtered by category, like Print, Slides, or Social.", suggestions: suggest("template", "category", ["Print", "Slides", "Social"]) },
  { key: "formats", kind: "template-formats", label: "Formats", help: "Add a Canva link, a file, or both. People see one button for each. Canva comes first when there is a link." },
  {
    key: "url", kind: "url", warn: canvaLinkWarning, label: "Old template link", optional: true,
    help: "From an earlier version of the site. Move it to the Canva link or the files above, then clear it.",
    when: (r) => r.type === "template" && !!r.url,
  },
  { key: "thumbnail", kind: "file", accept: [".png", ".jpg", ".jpeg", ".webp", ".svg"], label: "Thumbnail", help: "An image of the template, shown on its card. A 4 by 3 image works best." },
  { key: "rules", kind: "records", types: ["rule"], label: "Template rules", help: "Rules shown on this template's card.", optional: true },
];
