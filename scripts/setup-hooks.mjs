// Points git at the versioned hooks in .githooks. Run once after cloning: `pnpm setup-hooks`.
// Not a prepare or postinstall script: pnpm refuses git-hosted dependencies that run install scripts, and
// instances install the engine from git. Skips quietly outside a git work tree.
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
