// Entry points that Astro renders (each needs the site in context) and the page list the preview switches between.
import type { ReactNode } from "react";
import type { ModuleId } from "../../schemas/hub-config.ts";
import { MODULES } from "../modules/registry.ts";
import { Footer, Header, Sidebar } from "./Chrome.tsx";
import type { Site } from "./data.ts";
import { PhotosPage } from "./pages/AssetPages.tsx";
import { TemplatesPage } from "./pages/library/TemplatesPage.tsx";
import { IconsPage } from "./pages/library/IconsPage.tsx";
import { FontsPage } from "./pages/library/FontsPage.tsx";
import { ColorsPage } from "./pages/library/ColorsPage.tsx";
import { LogosPage } from "./pages/library/LogosPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { ChangesPage, ChapterPage, GuidePage, PlaceholderPage } from "./pages/OtherPages.tsx";
import { chapterHref, guideChapters } from "./nav.ts";
import { SiteContext } from "./ui.tsx";

export type PageId = "home" | ModuleId | `chapter:${string}`;

const BODIES: Partial<Record<ModuleId | "home", () => ReactNode>> = {
  home: HomePage,
  logos: LogosPage,
  colors: ColorsPage,
  fonts: FontsPage,
  icons: IconsPage,
  photos: PhotosPage,
  templates: TemplatesPage,
  changes: ChangesPage,
  guide: GuidePage,
};

/** Path a page lives at on the site. */
export function pagePath(page: PageId): string {
  if (page === "home") return "/";
  if (page.startsWith("chapter:")) return chapterHref(page.slice(8));
  return MODULES[page as ModuleId].route;
}

/** Pages a site has, in menu order: home, each enabled module, and each chapter when the guide is on. */
export function pageList(site: Site): { id: PageId; label: string }[] {
  return [
    { id: "home", label: "Home" },
    ...site.modules.map((m) => ({ id: m.id as PageId, label: m.label })),
    ...(site.isEnabled("guide") ? guideChapters(site).map((c) => ({ id: `chapter:${c.id}` as PageId, label: `Brand guide: ${c.title}` })) : []),
  ];
}


export function PageBody({ site, page }: { site: Site; page: PageId }) {
  let body: ReactNode;
  if (page.startsWith("chapter:")) {
    const chapter = site.brand.guide.chapters.find((c) => c.id === page.slice(8));
    body = chapter ? <ChapterPage chapter={chapter} /> : <PlaceholderPage title={MODULES.guide.label} />;
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

export const SiteSidebar = ({ site, path }: { site: Site; path: string }) => (
  <SiteContext.Provider value={site}>
    <Sidebar path={path} />
  </SiteContext.Provider>
);

export const SiteFooter = ({ site }: { site: Site }) => (
  <SiteContext.Provider value={site}>
    <Footer />
  </SiteContext.Provider>
);

/** A whole page (top bar, sidebar, main, footer) for the editor's preview frame. Same structure as Layout.astro. */
export function PreviewDocument({ site, page }: { site: Site; page: PageId }) {
  const path = pagePath(page).replace(/\/$/, "") || "/";
  return (
    <SiteContext.Provider value={site}>
      <Header path={path} />
      <div className="shell">
        <Sidebar path={path} />
        <div className="shell-main">
          <main id="main" tabIndex={-1}>
            <PageBody site={site} page={page} />
          </main>
          <Footer />
        </div>
      </div>
    </SiteContext.Provider>
  );
}
