import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { brandHub } from "./src/integration/index.ts";

// The engine repo runs as its own instance: hub.config.ts points at brands/demo.
export default defineConfig({
  output: "static",
  integrations: [react(), brandHub()],
});
