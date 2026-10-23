// Reads a brand folder from disk and validates it with checkBrand (src/content/check.ts).
// Any problem throws BrandDataError, which fails `astro build` and `pnpm check` with one line per problem.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { checkBrand, type BrandSource, type CheckedContent, type Problem } from "./check.ts";

export { SPLIT_FILES, type Problem } from "./check.ts";

export class BrandDataError extends Error {
  readonly problems: Problem[];
  constructor(brandDir: string, problems: Problem[]) {
    const lines = problems.map((p) => `  ${p.file}${p.id ? `  id "${p.id}"` : ""}: ${p.problem}`);
    super(`Brand data in ${rel(brandDir)} has ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n${lines.join("\n")}`);
    this.name = "BrandDataError";
    this.problems = problems;
  }
}

export interface BrandContent extends CheckedContent {
  dir: string;
}

const rel = (p: string) => relative(process.cwd(), p) || ".";

export function diskSource(brandDir: string): BrandSource {
  return {
    read: (name) => {
      const path = join(brandDir, name);
      return existsSync(path) ? readFileSync(path, "utf8") : undefined;
    },
    exists: (path) => {
      const abs = join(brandDir, path);
      return existsSync(abs) && statSync(abs).isFile();
    },
    label: (nameOrPath) => rel(join(brandDir, nameOrPath)),
  };
}

export function loadBrand(brandDir: string): BrandContent {
  if (!existsSync(brandDir) || !statSync(brandDir).isDirectory()) {
    throw new BrandDataError(brandDir, [{ file: rel(brandDir), problem: "brand folder not found", code: "missing-file" }]);
  }
  const { problems, content } = checkBrand(diskSource(brandDir));
  if (problems.length || !content) throw new BrandDataError(brandDir, problems);
  return { dir: brandDir, ...content };
}
