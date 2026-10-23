// Structure check for built pages (docs/STANDARDS.md, "Redesign copy and layout").
// Fails when an h1, h2, or h3 has a previous element sibling that holds only text of four words or fewer,
// the short label above a heading that the standards ban. Siblings inside nav are skipped.
// Usage: node scripts/check-structure.mjs [dir]   (default: dist). Run after a build: pnpm check:dist
// Exit code 1 if any failure is found.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { Window } from "happy-dom";

const ROOT = process.cwd();
const DIST = join(ROOT, process.argv[2] ?? "dist");
const MAX_WORDS = 4;
// Inline elements that still count as text when they wrap the label's words.
const TEXT_TAGS = new Set(["ABBR", "B", "BR", "CODE", "EM", "I", "MARK", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME"]);

if (!existsSync(DIST)) {
  console.log(`check-structure: ${relative(ROOT, DIST)} not found. Run pnpm build first.`);
  process.exit(1);
}

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
}

const onlyText = (el) => [...el.querySelectorAll("*")].every((d) => TEXT_TAGS.has(d.tagName));

const pages = [];
walk(DIST, pages);
pages.sort();

const window = new Window();
const parser = new window.DOMParser();
let failures = 0;
for (const page of pages) {
  const doc = parser.parseFromString(readFileSync(page, "utf8"), "text/html");
  for (const heading of doc.querySelectorAll("h1, h2, h3")) {
    const prev = heading.previousElementSibling;
    if (!prev || prev.closest("nav") || !onlyText(prev)) continue;
    const text = prev.textContent.replace(/\s+/g, " ").trim();
    if (!text || text.split(" ").length > MAX_WORDS) continue;
    console.log(`ERROR label-above-heading ${relative(ROOT, page)}  "${text}" above ${heading.tagName.toLowerCase()} "${heading.textContent.replace(/\s+/g, " ").trim()}"`);
    failures++;
  }
}
await window.happyDOM.close();

console.log(`\ncheck-structure: ${pages.length} pages, ${failures} failures`);
process.exit(failures ? 1 : 0);
