// File system side of the `local` adapter: used by the dev-only endpoint (src/routes/admin-local-api.ts).
// Reads and writes brands/<slug>/ in the instance, and reads history from git when the folder is in a repo.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { BrandContent } from "../types.ts";
import { checkBrand, DATA_FILES, type BrandSource } from "../../content/check.ts";
import { filePaths } from "../../content/file-paths.ts";
import { BrandDataError, diskSource } from "../../content/load.ts";

const ALL_FILES = ["brand.json", ...DATA_FILES, "changelog.json"];

/** Hash of the brand's data files. Changes whenever any record changes. */
export function revisionOf(source: Pick<BrandSource, "read">): string {
  const h = createHash("sha256");
  for (const name of ALL_FILES) h.update(`${name}\0${source.read(name) ?? ""}\0`);
  return h.digest("hex").slice(0, 16);
}

function contentFrom(slug: string, source: BrandSource, svgOf: (path: string) => string | undefined): BrandContent {
  const { problems, content } = checkBrand(source);
  if (!content) throw new BrandDataError(slug, problems);
  const svgs: Record<string, string> = {};
  for (const r of content.all) if (r.type === "icon") svgs[r.svgPath] = svgOf(r.svgPath) ?? "";
  return { slug, brand: content.brand, records: content.all, sources: content.sources, changelog: content.changelog, svgs };
}

export function readDraft(brandDir: string, slug: string): { revision: string; data: BrandContent } {
  const source = diskSource(brandDir);
  const svgOf = (p: string) => (existsSync(join(brandDir, p)) ? readFileSync(join(brandDir, p), "utf8") : undefined);
  return { revision: revisionOf(source), data: contentFrom(slug, source, svgOf) };
}

/** Resolves a change set path ("brands/<slug>/...") inside the brand folder, or throws. */
export function safePath(projectRoot: string, slug: string, path: string): string {
  const prefix = `brands/${slug}/`;
  const brandDir = resolve(projectRoot, "brands", slug);
  const abs = resolve(projectRoot, path);
  if (!path.startsWith(prefix) || path.includes("\\") || !abs.startsWith(brandDir + sep)) {
    throw new Error(`Refusing to write outside brands/${slug}/: ${path}`);
  }
  return abs;
}

export function applyChanges(projectRoot: string, slug: string, upserts: { path: string; data: string | Uint8Array }[], deletes: string[]): void {
  // Check every path before touching anything.
  const writes = upserts.map((u) => ({ abs: safePath(projectRoot, slug, u.path), data: u.data }));
  const removes = deletes.map((d) => safePath(projectRoot, slug, d));
  for (const w of writes) {
    mkdirSync(dirname(w.abs), { recursive: true });
    writeFileSync(w.abs, w.data);
  }
  for (const r of removes) rmSync(r, { force: true });
}

const git = (cwd: string, args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** Commits that touched the brand folder, newest first. Empty outside a git repository. */
export function gitHistory(projectRoot: string, slug: string, limit: number) {
  try {
    const out = git(projectRoot, ["log", `-n${limit}`, "--format=%H%x1f%aI%x1f%an%x1f%s%x1f%b%x1e", "--", `brands/${slug}`]);
    return out
      .split("\x1e")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((rec) => {
        const [revision = "", date = "", author = "", subject = "", body = ""] = rec.split("\x1f");
        return { revision, date, author, summary: [subject, ...body.split("\n").map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean)] };
      });
  } catch {
    return [];
  }
}

/** The brand as it was at a commit, plus the files it uses that the working folder no longer has. */
export function gitRevision(projectRoot: string, slug: string, revision: string) {
  if (!/^[0-9a-f]{7,40}$/.test(revision)) throw new Error("Not a commit id");
  const at = (p: string) => `${revision}:brands/${slug}/${p}`;
  const show = (p: string) => {
    try {
      return git(projectRoot, ["show", at(p)]);
    } catch {
      return undefined;
    }
  };
  const exists = (p: string) => {
    try {
      git(projectRoot, ["cat-file", "-e", at(p)]);
      return true;
    } catch {
      return false;
    }
  };
  const source: BrandSource = { read: show, exists, label: (n) => n };
  const data = contentFrom(slug, source, show);
  const brandDir = join(projectRoot, "brands", slug);
  const files: Record<string, string> = {};
  for (const r of data.records) {
    for (const { path } of filePaths(r)) {
      if (existsSync(join(brandDir, path))) continue;
      const buf = execFileSync("git", ["show", at(path)], { cwd: projectRoot, stdio: ["ignore", "pipe", "ignore"] });
      files[path] = buf.toString("base64");
    }
  }
  return { revision, data, files };
}
