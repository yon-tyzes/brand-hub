// Copy and markup standards check.
// Scans source, docs, and brand data for patterns banned in docs/STANDARDS.md.
// Usage: node scripts/check-copy.mjs [dir ...]   (defaults: src docs brands README.md)
// Exit code 1 if any error is found. Wire into `npm run check` and CI.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = process.argv.slice(2).length ? process.argv.slice(2) : ["src", "docs", "brands", "README.md"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".astro", "research", ".netlify"]);
const TEXT_EXT = new Set([".astro", ".ts", ".tsx", ".js", ".mjs", ".jsx", ".json", ".md", ".mdx", ".html", ".css", ".svg", ".yml", ".yaml"]);
// Files that list the banned terms on purpose.
const SELF = new Set(["scripts/check-copy.mjs", "docs/STANDARDS.md"]);

const RULES = [
  { id: "em-dash", level: "error", re: /\u2014/g, msg: "Em dash. Use a period, comma, or colon." },
  { id: "en-dash", level: "warn", re: /\u2013/g, msg: "En dash. Use a hyphen for ranges or rewrite." },
  { id: "attribution", level: "error", re: /\b(claude|anthropic|chatgpt|openai|copilot|gpt-\d)\b/gi, msg: "Tool or assistant name in shipped text." },
  { id: "ai-credit", level: "error", re: /\b(ai[- ]generated|generated (by|with) ai|written (by|with) ai|authored by|made with ai|powered by ai)\b/gi, msg: "Authorship or AI credit line." },
  { id: "eyebrow", level: "error", re: /\b(eyebrow|kicker|overline|pretitle|supertitle|section-label)\b/gi, msg: "Eyebrow pattern. Headings stand alone." },
  { id: "filler", level: "error", re: /\b(game[- ]changer|seamless(ly)?|unlock(s|ing)? (the|your)|elevate (your|the)|supercharge|revolutioniz\w*|cutting[- ]edge|next[- ]level|in today's (fast[- ]paced|digital)|delve|leverage the power|empower(s|ing)? (you|teams)|effortless(ly)?|world[- ]class|robust solution|all[- ]in[- ]one)\b/gi, msg: "Filler phrase. Say the specific thing." },
  { id: "placeholder", level: "error", re: /\b(lorem ipsum|TBD|TODO copy|placeholder text)\b/gi, msg: "Placeholder content. Remove the slot instead." },
  { id: "confidential", level: "warn", re: /\bCONFIDENTIAL\b/g, msg: "CONFIDENTIAL label. Not allowed on proposal footers." },
];

function walk(p, out) {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const name of readdirSync(p)) {
      if (SKIP_DIRS.has(name)) continue;
      walk(join(p, name), out);
    }
  } else if (TEXT_EXT.has(extname(p)) && !SELF.has(relative(ROOT, p))) {
    out.push(p);
  }
}

const files = [];
for (const t of TARGETS) walk(join(ROOT, t), files);

let errors = 0;
let warns = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("check-copy: ignore")) return;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (!m) continue;
      const loc = `${relative(ROOT, file)}:${i + 1}`;
      console.log(`${rule.level.toUpperCase()} ${rule.id} ${loc}  "${m[0]}"  ${rule.msg}`);
      rule.level === "error" ? errors++ : warns++;
    }
  });
}

console.log(`\ncheck-copy: ${files.length} files, ${errors} errors, ${warns} warnings`);
process.exit(errors ? 1 : 0);
