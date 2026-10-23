// Validates every brand under brands/: schemas, unique ids, references, file paths, contrast. Prints
// warnings for 0.1 data that still loads (src/content/legacy.ts).
// Usage: node scripts/validate-brands.ts [slug ...]   (defaults to every folder in brands/)
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BrandDataError, formatWarning, loadBrand } from "../src/content/load.ts";

const root = join(import.meta.dirname, "..", "brands");
const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory());

let failed = 0;
for (const slug of slugs) {
  try {
    const c = loadBrand(join(root, slug));
    console.log(`brands/${slug}: ok (${c.all.length} records, ${c.assets.length} locked assets, ${c.rules.length} locked rules)`);
    for (const w of c.warnings) console.warn(`  warning ${formatWarning(w)}`);
  } catch (e) {
    failed++;
    console.error(e instanceof BrandDataError ? e.message : e);
  }
}
process.exit(failed ? 1 : 0);
