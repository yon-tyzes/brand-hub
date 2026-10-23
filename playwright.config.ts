import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the built site. Run `pnpm build` first.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4322", ...devices["Desktop Chrome"] },
  webServer: { command: "node e2e/serve.mjs 4322", url: "http://127.0.0.1:4322/", reuseExistingServer: !process.env.CI },
});
