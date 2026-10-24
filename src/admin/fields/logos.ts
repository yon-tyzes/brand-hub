import { suggest, type FieldDef } from "./types.ts";

export const logoFields: FieldDef[] = [
  { key: "lockup", kind: "text", label: "Layout", help: "How the logo is arranged, like Horizontal, Stacked, or Mark.", suggestions: suggest("logo", "lockup", ["Horizontal", "Stacked", "Mark"]) },
  { key: "colorway", kind: "text", label: "Color version", help: "Like Full color, Reversed, or One color.", suggestions: suggest("logo", "colorway", ["Full color", "Reversed", "One color"]) },
  {
    key: "background",
    kind: "select",
    label: "Made for",
    help: "The background this version is designed to sit on. The site previews it there.",
    options: [
      { value: "light", label: "Light backgrounds" },
      { value: "dark", label: "Dark backgrounds" },
    ],
  },
  { key: "files", kind: "logo-files", label: "Files", help: "Each file becomes a download, named by use. Add an SVG and a PNG at least. Print and sign vendors often ask for PDF or EPS." },
];
