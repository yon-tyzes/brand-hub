import { defineHub } from "./src/index.ts";

export default defineHub({
  brand: "demo",
  modules: ["start", "logos", "colors", "fonts", "icons", "photos",
            "templates", "signature", "boilerplate", "guide", "whats-new"],
  search: { shortcut: ["mod+k", "/"] },
  indexing: false,
  admin: { enabled: true },
  uploads: { maxBytes: 25_000_000 },
});
