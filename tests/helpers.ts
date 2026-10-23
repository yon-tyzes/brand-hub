// Test fixtures: a throwaway copy of tests/fixtures/brand (a frozen, minimal brand) that each test
// can break in one specific way. The live demo brand is validated by `pnpm check` instead.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";

const FIXTURE = join(import.meta.dirname, "fixtures", "brand");
const roots: string[] = [];

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** Creates <tmp>/brands/demo from the fixture brand. Returns the project root and the brand folder. */
export function demoCopy(): { root: string; brandDir: string } {
  const root = mkdtempSync(join(tmpdir(), "brand-hub-test-"));
  roots.push(root);
  const brandDir = join(root, "brands", "demo");
  cpSync(FIXTURE, brandDir, { recursive: true });
  return { root, brandDir };
}

/** Reads a JSON file in the brand folder, lets the test change it, and writes it back. */
export function edit<T = any>(brandDir: string, file: string, change: (data: T) => T | void): void {
  const path = join(brandDir, file);
  const data = JSON.parse(readFileSync(path, "utf8")) as T;
  const next = change(data);
  writeFileSync(path, JSON.stringify(next ?? data, null, 2));
}

export function write(dir: string, file: string, text: string): void {
  writeFileSync(join(dir, file), text);
}
