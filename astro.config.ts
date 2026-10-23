import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { brandHub } from "./src/integration/index.ts";

// The engine repo runs as its own instance: hub.config.ts points at brands/demo.
export default defineConfig({
  // Netlify sets URL to the site's main address, which gives indexed pages a canonical link.
  site: process.env.URL,
  output: "static",
  integrations: [react(), brandHub()],
});
