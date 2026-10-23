// Site header and footer (docs/DESIGN_SYSTEM.md). Menus, theme, and search are wired by src/scripts/shell.ts.
import { ASSET_MODULES } from "../modules/registry.ts";
import { formatDate, logoFile } from "./data.ts";
import { Icon, IconTile, ThemeSwitch, useSite } from "./ui.tsx";

export function Header({ path }: { path: string }) {
  const site = useSite();
  const assetModules = site.modules.filter((m) => ASSET_MODULES.includes(m.id));
  const otherModules = site.modules.filter((m) => !ASSET_MODULES.includes(m.id));
  const current = (route: string) => (path === route || path.startsWith(`${route}/`) ? ("page" as const) : undefined);
  const mark = site.assetsOfType("logo").find((l) => l.lockup.toLowerCase() === "mark" && l.background === "light");
  const markFile = mark && (logoFile(mark, "svg") ?? logoFile(mark, "png"));

  return (
    <header className="site-header" data-menu-root="">
      <div className="header-bar">
        <a className="brand-link" href="/" aria-current={path === "/" ? "page" : undefined}>
          {markFile && <img src={site.urlFor(markFile.path)} alt="" width={28} height={28} />}
          <span>{site.brand.shortName}</span>
        </a>

        <nav className="header-nav" aria-label="Main">
          {assetModules.length > 0 && (
            <button className="nav-link" type="button" aria-expanded="false" aria-controls="module-menu" data-menu-trigger="">
              Modules <Icon name="chevron-down" size={16} />
            </button>
          )}
          {otherModules.map((m) => (
            <a key={m.id} className="nav-link" href={m.route} aria-current={current(m.route)}>{m.label}</a>
          ))}
        </nav>

        <div className="header-tools">
          <button className="btn btn-secondary btn-sm btn-icon header-search" type="button" data-search-open="">
            <Icon name="search" />
            <span className="header-search-label">Search</span>
            <kbd className="kbd" aria-hidden="true">Ctrl K</kbd>
          </button>
          <span className="theme-desktop"><ThemeSwitch /></span>
          <button className="btn btn-secondary btn-sm btn-icon menu-button" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu" data-mobile-menu-trigger="">
            <Icon name="menu" />
          </button>
        </div>

        {assetModules.length > 0 && (
          <div className="menu-panel" id="module-menu" hidden>
            <ul className="menu-rows" role="list">
              {assetModules.map((m) => (
                <li key={m.id}>
                  <a className="menu-row" href={m.route} aria-current={current(m.route)}>
                    <IconTile name={m.icon} />
                    <span>
                      <strong>{m.label}</strong>
                      <small>{m.help}</small>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            {otherModules.length > 0 && (
              <div className="menu-links">
                <h2>More</h2>
                <ul className="stack" role="list">
                  {otherModules.map((m) => <li key={m.id}><a href={m.route}>{m.label}</a></li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <nav className="mobile-menu" id="mobile-menu" aria-label="Main" hidden>
          <ul role="list">
            {site.modules.map((m) => (
              <li key={m.id}>
                <a href={m.route} aria-current={current(m.route)}>
                  {m.label}
                  <Icon name="arrow-right" />
                </a>
              </li>
            ))}
          </ul>
          <div className="theme-row">
            <span>Theme</span>
            <ThemeSwitch />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const site = useSite();
  const contact = site.brand.contact;
  const lastPublish = site.sortedChangelog()[0]?.date;
  const contactHost = contact?.url ? new URL(contact.url).host : undefined;
  return (
    <footer className="site-footer">
      <div className="frame">
        <div className="footer-top">
          <div className="footer-brand">
            <strong>{site.brand.name}</strong>
            {site.brand.description && <p className="small">{site.brand.description}</p>}
          </div>
          <div className="footer-cols">
            <section className="footer-col" aria-labelledby="footer-modules">
              <h2 id="footer-modules">Brand assets</h2>
              <ul role="list">
                <li><a href="/">Home</a></li>
                {site.modules.map((m) => <li key={m.id}><a href={m.route}>{m.label}</a></li>)}
              </ul>
            </section>
            {(contact?.email || contact?.url) && (
              <section className="footer-col" aria-labelledby="footer-contact">
                <h2 id="footer-contact">Brand contact</h2>
                <ul role="list">
                  {contact.email && <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
                  {contact.url && <li><a href={contact.url}>{contactHost}</a></li>}
                </ul>
              </section>
            )}
          </div>
        </div>
        <div className="footer-bottom caption">
          <span>Brand Hub {site.engineVersion}</span>
          {lastPublish && (
            <span>
              Last update <time dateTime={lastPublish}>{formatDate(lastPublish)}</time>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
