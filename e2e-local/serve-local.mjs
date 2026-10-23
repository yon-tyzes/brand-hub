// Starts `astro dev` on a throwaway copy of this repo, so the local adapter can write brand files without
// touching the real ones. Writes the copy's path to e2e-local/.root for the tests, and deletes the copy when
// Playwright stops the server (SIGTERM, see playwright.local.config.ts) or on Ctrl+C.
// Usage: node e2e-local/serve-local.mjs [port]
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { dev } from "astro";

const repo = join(import.meta.dirname, "..");
const port = Number(process.argv[2] ?? 4330);
// Real path: on macOS the temp folder is a symlink (/var to /private/var), and Vite checks real paths.
const root = realpathSync(mkdtempSync(join(tmpdir(), "brand-hub-local-")));
const SKIP = /^(node_modules|dist|research|\.astro|test-results|\.git|e2e-local\/\.root)(\/|$)/;

cpSync(repo, root, { recursive: true, filter: (src) => !SKIP.test(relative(repo, src)) });
symlinkSync(join(repo, "node_modules"), join(root, "node_modules"), "dir");
const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
git("init", "-q", "-b", "main");
git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-q", "--allow-empty", "-m", "start");
git("add", "-A");
git("-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "Demo brand as committed");
const rootFile = join(repo, "e2e-local", ".root");
writeFileSync(rootFile, root);

// node_modules is a symlink to the repo's, which sits outside the copy: let Vite serve it.
const server = await dev({ root, server: { port, host: "127.0.0.1" }, logLevel: "warn", devToolbar: { enabled: false }, vite: { server: { fs: { allow: [root, repo] } } } });
console.log(`local adapter test server on http://127.0.0.1:${port} for ${root}`);

// Vite's own SIGTERM listener closes the server and exits, so delete the copy on exit, whoever ends it.
process.once("exit", () => {
  rmSync(root, { recursive: true, force: true });
  rmSync(rootFile, { force: true });
});
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => void server.stop().finally(() => process.exit(0)));
