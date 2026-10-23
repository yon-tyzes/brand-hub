import { defineConfig, devices } from "@playwright/test";

// Local adapter tests: `astro dev` on a temporary copy of the repo, deleted when the run ends. Run with `pnpm test:local`.
export default defineConfig({
  testDir: "e2e-local",
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4330", ...devices["Desktop Chrome"] },
  webServer: { command: "node e2e-local/serve-local.mjs 4330", url: "http://127.0.0.1:4330/admin/", timeout: 120_000, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 } },
});
