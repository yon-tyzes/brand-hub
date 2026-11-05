import { defineHub } from "./src/index.ts";

export default defineHub({
  brand: "demo",
  // Office theme, company descriptions, New to the team, and the signature arrive in 0.3 and 0.4. brands/demo already
  // holds signature.json and onboarding.json; add "signature" and "start" here once their pages are built.
  modules: ["logos", "colors", "fonts", "icons", "photos", "templates", "guide", "changes"],
  search: { shortcut: ["mod+k", "/"] },
  // Search engines may index the public demo only: netlify.toml sets this for production deploys.
  indexing: process.env.BRAND_HUB_INDEXING === "true",
  // The dev server edits brands/demo on disk; the public demo build keeps edits in memory.
  admin: { enabled: true, adapter: { dev: "local", build: "demo" }, auth: { dev: "local", build: "demo" } },
  uploads: { maxBytes: 25_000_000 },
});
