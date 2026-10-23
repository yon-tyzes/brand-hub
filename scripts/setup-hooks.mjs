// Points git at the versioned hooks in .githooks. Runs on `pnpm install` via the prepare script.
// Skips quietly outside a git work tree (tarball installs, some CI caches).
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
} catch {
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"]);
if (existsSync(".githooks/commit-msg")) chmodSync(".githooks/commit-msg", 0o755);
console.log("git hooks: core.hooksPath set to .githooks");
