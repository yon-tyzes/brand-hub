import type { FieldDef } from "./types.ts";

export const ruleFields: FieldDef[] = [
  { key: "title", kind: "text", label: "Rule", help: "The rule as a short sentence, like “Keep clear space around the logo.”" },
  { key: "chapter", kind: "chapter", label: "Chapter", help: "The Brand guide chapter this rule appears in. Add or rename chapters in Brand settings." },
  { key: "body", kind: "textarea", rows: 6, label: "Explanation", help: "Plain text. Leave a blank line between paragraphs." },
  { key: "do", kind: "lines", label: "Do", help: "One example per line.", optional: true },
  { key: "dont", kind: "lines", label: "Don't", help: "One example per line.", optional: true },
  { key: "appliesTo", kind: "records", types: ["logo", "color", "font", "icon", "template", "photo-source"], label: "Applies to", help: "The items this rule covers. They link back to this rule on the site.", optional: true },
];
