import { suggest, type FieldDef } from "./types.ts";

export const fontFields: FieldDef[] = [
  { key: "family", kind: "text", label: "Font family", help: "The name apps show in their font menu, like Inter." },
  { key: "role", kind: "text", label: "Used for", help: "Like Headings, Body, or Both.", suggestions: suggest("font", "role", ["Headings", "Body", "Both"]) },
  { key: "weights", kind: "chips", numeric: true, label: "Weights", help: "Numbers like 400 for regular and 700 for bold, in the same order as the files below." },
  { key: "files", kind: "font-files", variant: "static", label: "Font files", help: "One file per weight. These go into the font download." },
  { key: "files", kind: "font-files", variant: "variable", label: "Variable font file", help: "One file that holds every weight. Optional; it gets its own download.", optional: true },
  { key: "license", kind: "text", label: "License", help: "The license name from the font's download page, like OFL-1.1." },
  { key: "install", kind: "textarea", rows: 3, label: "Install note", help: "Anything extra people need to know when installing this font." },
];
