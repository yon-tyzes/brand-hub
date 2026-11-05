import { defineHub } from "./src/index.ts";

export default defineHub({
  brand: "demo",
  // Company descriptions arrive in 0.4.
  modules: ["logos", "colors", "fonts", "icons", "photos", "templates", "office", "guide", "start", "signature", "changes"],
  search: { shortcut: ["mod+k", "/"] },
  // Search engines may index the public demo only: netlify.toml sets this for production deploys.
  indexing: process.env.BRAND_HUB_INDEXING === "true",
  // The dev server edits brands/demo on disk; the public demo build keeps edits in memory.
  admin: { enabled: true, adapter: { dev: "local", build: "demo" }, auth: { dev: "local", build: "demo" } },
  uploads: { maxBytes: 25_000_000 },
});
