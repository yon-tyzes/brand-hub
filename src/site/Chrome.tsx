// Site top bar and footer (docs/DESIGN_SYSTEM.md, TopTabs). Theme, search, and the frosted bar are wired by
// src/scripts/shell.ts.
import { formatDate, logoFile } from "./data.ts";
import { currentTab, navTabs } from "./nav.ts";
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
          <button className="search-trigger" type="button" data-search-open="" aria-label="Search">
            <Icon name="search" size={16} />
            <span className="search-trigger-label" aria-hidden="true">Search</span>
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
    </>
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
