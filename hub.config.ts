import { defineHub } from "./src/index.ts";

export default defineHub({
  brand: "demo",
  // Start, signature, and boilerplate arrive in 0.3 and 0.4.
  modules: ["logos", "colors", "fonts", "icons", "photos", "templates", "guide", "whats-new"],
  search: { shortcut: ["mod+k", "/"] },
  // Search engines may index the public demo only: netlify.toml sets this for production deploys.
  indexing: process.env.BRAND_HUB_INDEXING === "true",
  // The dev server edits brands/demo on disk; the public demo build keeps edits in memory.
  admin: { enabled: true, adapter: { dev: "local", build: "demo" }, auth: { dev: "local", build: "demo" } },
  uploads: { maxBytes: 25_000_000 },
});
