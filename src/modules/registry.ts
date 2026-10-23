// Route and nav label for each module. Labels are plain words (docs/STANDARDS.md).
import type { ModuleId } from "../../schemas/hub-config.ts";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  route: string;
}

export const MODULES: Record<ModuleId, ModuleDef> = {
  start: { id: "start", label: "Start", route: "/start" },
  logos: { id: "logos", label: "Logos", route: "/logos" },
  colors: { id: "colors", label: "Colors", route: "/colors" },
  fonts: { id: "fonts", label: "Fonts", route: "/fonts" },
  icons: { id: "icons", label: "Icons", route: "/icons" },
  photos: { id: "photos", label: "Photos", route: "/photos" },
  templates: { id: "templates", label: "Templates", route: "/templates" },
  signature: { id: "signature", label: "Signature", route: "/signature" },
  boilerplate: { id: "boilerplate", label: "Boilerplate", route: "/boilerplate" },
  guide: { id: "guide", label: "Guide", route: "/guide" },
  "whats-new": { id: "whats-new", label: "What's new", route: "/whats-new" },
};
