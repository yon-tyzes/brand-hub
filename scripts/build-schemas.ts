// Generates schemas/*.schema.json from the zod sources so editors can autocomplete brand data.
// Usage: node scripts/build-schemas.ts          write the files
//        node scripts/build-schemas.ts --check  exit 1 if any file is missing or stale
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { assetsFile, rulesFile, brand, changelogFile } from "../schemas/index.ts";

const OUT = new URL("../schemas/", import.meta.url);

const targets = {
  "brand.schema.json": { schema: brand, title: "Brand Hub brand.json" },
  "assets.schema.json": { schema: assetsFile, title: "Brand Hub assets file (assets.json or a per-module split file)" },
  "rules.schema.json": { schema: rulesFile, title: "Brand Hub rules.json" },
  "changelog.schema.json": { schema: changelogFile, title: "Brand Hub changelog.json" },
};

const check = process.argv.includes("--check");
const stale: string[] = [];

for (const [file, { schema, title }] of Object.entries(targets)) {
  const json = { title, ...z.toJSONSchema(schema, { target: "draft-2020-12", io: "input", unrepresentable: "any" }) };
  const text = JSON.stringify(json, null, 2) + "\n";
  const url = new URL(file, OUT);
  if (check) {
    if (!existsSync(url) || readFileSync(url, "utf8") !== text) stale.push(file);
  } else {
    writeFileSync(url, text);
    console.log(`wrote schemas/${file}`);
  }
}

if (stale.length) {
  console.error(`JSON Schema out of date: ${stale.join(", ")}. Run: pnpm schemas`);
  process.exit(1);
}
if (check) console.log("schemas: JSON Schema files are current");
