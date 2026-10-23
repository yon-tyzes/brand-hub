import { defineHub } from "./src/index.ts";

export default defineHub({
  brand: "demo",
  // Start, signature, and boilerplate arrive in 0.3 and 0.4.
  modules: ["logos", "colors", "fonts", "icons", "photos", "templates", "guide", "whats-new"],
  search: { shortcut: ["mod+k", "/"] },
  indexing: false,
  admin: { enabled: true },
  uploads: { maxBytes: 25_000_000 },
});
