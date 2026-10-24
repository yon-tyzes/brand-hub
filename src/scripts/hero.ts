// Home hero gradient (DESIGN_SYSTEM.md, section 9). Loaded after first paint by src/modules/home/index.astro.
// Picks the preset from hub.config.ts (hero.preset) and runs it; src/scripts/hero-gl.ts does the drawing.
import { mesh, start } from "./hero-gl.ts";

const hero = document.querySelector<HTMLElement>("[data-hero]");
if (hero) {
  const preset = hero.dataset.heroPreset === "contour" ? (await import("./hero-contour.ts")).contour(hero) : mesh;
  if (!start(hero, preset)) hero.dataset.heroState = "static";
}
