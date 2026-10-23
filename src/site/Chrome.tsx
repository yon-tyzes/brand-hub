// Site top bar and footer (docs/DESIGN_SYSTEM.md, TopTabs). Theme, search, and the frosted bar are wired by
// src/scripts/shell.ts.
import type { CSSProperties } from "react";
import { MODULES } from "../modules/registry.ts";
import { logoFile } from "./data.ts";
import { currentTab, navTabs, sidebarFor } from "./nav.ts";
import { uiIconSvg } from "../lib/ui-icons.ts";
import { Icon, ThemeToggle, useSite } from "./ui.tsx";

export function Header({ path }: { path: string }) {
  const site = useSite();
  const tabs = navTabs(site);
  const active = currentTab(site, path);
  const mark = site.assetsOfType("logo").find((l) => l.lockup.toLowerCase() === "mark" && l.background === "light");
  const markFile = mark && (logoFile(mark, "svg") ?? logoFile(mark, "png"));
  const modK = site.config.search.shortcut.some((s) => s.toLowerCase() === "mod+k");

  return (
    <>
      <header className="topbar" data-topbar="">
        <a className="topbar-brand" href="/">
          {markFile && <img src={site.urlFor(markFile.path)} alt="" width={26} height={26} />}
          <span>{site.brand.shortName}</span>
        </a>
        <nav className="topbar-tabs" aria-label="Main">
          {tabs.map((t) => (
            <a key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}>{t.label}</a>
          ))}
        </nav>
        <div className="topbar-tools">
          <button className="search-trigger" type="button" data-search-open="">
            <Icon name="search" size={16} />
            <span className="search-trigger-label">Search</span>
            {modK && (
              <span className="search-trigger-keys" aria-hidden="true">
                <kbd className="kbd-mac">⌘K</kbd>
                <kbd className="kbd-other">Ctrl K</kbd>
              </span>
            )}
          </button>
          <ThemeToggle />
        </div>
      </header>
      {/* Below 768px the tabs move here, as a segmented control under the bar. */}
      <nav className="tabs-segmented" aria-label="Main" style={{ "--tab-count": tabs.length } as CSSProperties}>
        {tabs.map((t) => (
          <a key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}>{t.label}</a>
        ))}
      </nav>
    </>
  );
}

/** The current tab's categories (DESIGN_SYSTEM.md, Sidebar). On every page, the home page included. */
export function Sidebar({ path }: { path: string }) {
  const site = useSite();
  const nav = sidebarFor(site, path);
  const email = site.brand.contact?.email;
  return (
    <nav className="sidebar" aria-label={nav.label}>
      <div className="sidebar-inner">
        <ul className="sidebar-items" role="list">
          {nav.items.map((item) => (
            <li key={item.id}>
              <a
                className="sidebar-item"
                href={item.href}
                aria-current={item.id === nav.current ? "page" : undefined}
                {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
              >
                {item.icon && <Icon name={item.icon} size={18} />}
                <span className="sidebar-label">{item.label}</span>
                {item.external ? (
                  <span className="sidebar-end" role="img" aria-label="Opens in a new tab" dangerouslySetInnerHTML={{ __html: uiIconSvg("external", 14) }} />
                ) : (
                  item.count !== undefined && <span className="sidebar-end sidebar-count">{item.count}</span>
                )}
              </a>
            </li>
          ))}
        </ul>
        {email && (
          <p className="sidebar-contact">
            Brand questions
            <br />
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        )}
      </div>
    </nav>
  );
}

/** Links to the change log and the brand contact. The engine version never appears on public pages. */
export function Footer() {
  const site = useSite();
  const contact = site.brand.contact;
  const links = [
    ...(site.isEnabled("changes") ? [{ href: `${MODULES.changes.route}/`, label: MODULES.changes.label }] : []),
    ...(contact?.email ? [{ href: `mailto:${contact.email}`, label: contact.email }] : []),
    ...(contact?.url ? [{ href: contact.url, label: new URL(contact.url).host }] : []),
  ];
  return (
    <footer className="site-footer">
      <div className="frame footer-row">
        <span className="small">{site.brand.name}</span>
        {links.length > 0 && (
          <ul className="footer-links" role="list" aria-label="Site and contact">
            {links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
        )}
      </div>
    </footer>
  );
}
