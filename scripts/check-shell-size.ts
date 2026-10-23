// Budget check for the shared shell script, the only JS on pages without islands (spec section 6): theme
// switch, menus, toasts, copy buttons, and the search shortcut. Bundles src/scripts/shell.ts with its imports,
// minified, and fails if what loads on every page is over 5 KB gzipped. Nothing is written to disk.
// Usage: node scripts/check-shell-size.ts
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { build, type Rollup } from "vite";

const BUDGET = 5 * 1024;
const entry = fileURLToPath(new URL("../src/scripts/shell.ts", import.meta.url));

const result = await build({
  configFile: false,
  logLevel: "silent",
  build: { write: false, minify: true, lib: { entry, formats: ["es"], fileName: "shell" } },
});
const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
const chunks = new Map(outputs.flatMap((o) => o.output).filter((c): c is Rollup.OutputChunk => c.type === "chunk").map((c) => [c.fileName, c]));
// Count what loads with every page: the entry and its static imports. Dynamic imports (the search dialog,
// loaded the first time search opens) are islands and have their own budget.
const loaded = new Set<string>();
const visit = (name: string) => {
  const c = chunks.get(name);
  if (!c || loaded.has(name)) return;
  loaded.add(name);
  c.imports.forEach(visit);
};
for (const c of chunks.values()) if (c.isEntry) visit(c.fileName);
const code = [...loaded].map((n) => chunks.get(n)!.code).join("\n");
const size = gzipSync(code).length;
const line = `shell script: ${(size / 1024).toFixed(2)} KB gzipped (budget ${BUDGET / 1024} KB)`;
if (size > BUDGET) {
  console.error(`${line}. Move the new code into an island or a page script that loads where it is needed.`);
  process.exit(1);
}
console.log(line);
