// Entry points that Astro renders (each needs the site in context) and the page list the preview switches between.
import type { ReactNode } from "react";
import type { ModuleId } from "../../schemas/hub-config.ts";
import { MODULES } from "../modules/registry.ts";
import { Footer, Header } from "./Chrome.tsx";
import type { Site } from "./data.ts";
import { ColorsPage, FontsPage, IconsPage, LogosPage, PhotosPage, TemplatesPage } from "./pages/AssetPages.tsx";
import { GuidePage, HomePage, PlaceholderPage, RulePage, WhatsNewPage } from "./pages/OtherPages.tsx";
import { SiteContext } from "./ui.tsx";

export type PageId = "home" | ModuleId | `rule:${string}`;

const BODIES: Partial<Record<ModuleId | "home", () => ReactNode>> = {
  home: HomePage,
  logos: LogosPage,
  colors: ColorsPage,
  fonts: FontsPage,
  icons: IconsPage,
  photos: PhotosPage,
  templates: TemplatesPage,
  "whats-new": WhatsNewPage,
  guide: GuidePage,
};

/** Path a page lives at on the site. */
export function pagePath(page: PageId): string {
  if (page === "home") return "/";
  if (page.startsWith("rule:")) return `/guide/${page.slice(5)}`;
  return MODULES[page as ModuleId].route;
}

/** Pages a site has, in menu order: home, each enabled module, and each rule page when the guide is on. */
export function pageList(site: Site): { id: PageId; label: string }[] {
  return [
    { id: "home", label: "Home" },
    ...site.modules.map((m) => ({ id: m.id as PageId, label: m.label })),
    ...(site.isEnabled("guide") ? site.rules.map((r) => ({ id: `rule:${r.id}` as PageId, label: `Guide: ${r.title}` })) : []),
  ];
}


export function PageBody({ site, page }: { site: Site; page: PageId }) {
  let body: ReactNode;
  if (page.startsWith("rule:")) {
    const rule = site.findRule(page.slice(5));
    body = rule ? <RulePage rule={rule} /> : <PlaceholderPage title="Guide" />;
  } else {
    const B = BODIES[page as ModuleId | "home"];
    body = B ? <B /> : <PlaceholderPage title={MODULES[page as ModuleId]?.label ?? "Page"} />;
  }
  return <SiteContext.Provider value={site}>{body}</SiteContext.Provider>;
}

export const SiteHeader = ({ site, path }: { site: Site; path: string }) => (
  <SiteContext.Provider value={site}>
    <Header path={path} />
  </SiteContext.Provider>
);

export const SiteFooter = ({ site }: { site: Site }) => (
  <SiteContext.Provider value={site}>
    <Footer />
  </SiteContext.Provider>
);

/** A whole page body (header, main, footer) for the editor's preview frame. */
export function PreviewDocument({ site, page }: { site: Site; page: PageId }) {
  return (
    <SiteContext.Provider value={site}>
      <Header path={pagePath(page).replace(/\/$/, "") || "/"} />
      <main id="main" tabIndex={-1}>
        <PageBody site={site} page={page} />
      </main>
      <Footer />
    </SiteContext.Provider>
  );
}
