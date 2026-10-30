import { suggest, type FieldDef } from "./types.ts";

export const fontFields: FieldDef[] = [
  { key: "family", kind: "text", label: "Font family", help: "The name apps show in their font menu, like Inter." },
  { key: "group", kind: "font-group", label: "Group", help: "The section of the Fonts page this family shows in. Groups are set in Brand settings." },
  { key: "role", kind: "text", label: "Used for", help: "Like Headings, Body, or Both.", suggestions: suggest("font", "role", ["Headings", "Body", "Both"]) },
  { key: "weights", kind: "chips", numeric: true, label: "Weights", help: "Numbers like 400 for regular and 700 for bold, in the same order as the files below." },
  { key: "files", kind: "font-files", variant: "static", label: "Font files", help: "One TTF or OTF file per weight. These go into the font download for Word and PowerPoint." },
  { key: "files", kind: "font-files", variant: "variable", label: "Variable font file", help: "One file that holds every weight. Optional; it gets its own download.", optional: true },
  { key: "files", kind: "font-files", variant: "web", label: "Web font files", help: "WOFF2 files the site uses to show this font. They are never in a download.", optional: true },
  { key: "license", kind: "text", label: "License", help: "The license name from the font's download page, like OFL-1.1." },
  { key: "install", kind: "textarea", rows: 3, label: "Install note", help: "Anything extra people need to know when installing this font." },
];
