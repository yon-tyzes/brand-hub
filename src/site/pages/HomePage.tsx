// The home page (spec section 6, Home hero): search first, then Quick downloads, then a preview of each
// Library category. It is the Library's "All files"; nothing stands in front of it.
import type { ReactNode } from "react";
import type { Asset, ColorAsset, FontAsset, IconAsset, LogoAsset, TemplateAsset } from "../../../schemas/asset.ts";
import { MODULES } from "../../modules/registry.ts";
import { fontZips, logoFile } from "../data.ts";
import { colorRows, darkGround, logoDownloads } from "../library.ts";
import { AssetCard, Button, Chip, ColorRows, DownloadButton, Icon, useSite } from "../ui.tsx";

/** The file to draw a logo with: SVG when there is one. */
function logoImage(l: LogoAsset) {
  return logoFile(l, "svg") ?? logoFile(l, "png");
}

/** First words of the search hint: a real asset name from the brand's data. */
function searchHint(assets: Asset[]): string {
  const a = assets.find((x) => x.type === "logo") ?? assets[0];
  return a ? `Try "${a.label.toLowerCase()}"` : "Search the brand";
}

function Hero() {
  const site = useSite();
  const picks = site.brand.quickDownloads.map((id) => site.findAsset(id)).filter((a): a is Asset => !!a).slice(0, 4);
  const slash = site.config.search.shortcut.includes("/");
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-mesh" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-title" id="hero-title">
          {site.brand.shortName}
          <br />
          brand files
        </h1>
        <div className="hero-search" role="search">
          <Icon name="search" size={20} />
          <label className="visually-hidden" htmlFor="hero-q">Search the brand</label>
          <input id="hero-q" type="search" placeholder={searchHint(site.assets)} autoComplete="off" spellCheck={false} data-hero-search="" />
          {slash && <kbd aria-hidden="true">/</kbd>}
        </div>
        {picks.length > 0 && <div className="chips hero-chips">{picks.map((a) => <QuickPick key={a.id} asset={a} />)}</div>}
      </div>
    </section>
  );
}

/** A frosted chip naming what people come for: "Logo for slides", the primary color, "Font files". */
function QuickPick({ asset: a }: { asset: Asset }) {
  const site = useSite();
  switch (a.type) {
    case "logo": {
      const d = logoDownloads(site, a)[0];
      return d ? <Chip glass href={d.href} download={d.filename} icon="download">Logo for slides</Chip> : null;
    }
    case "color":
      return <Chip glass dot={a.hex} data-copy={a.hex} data-copy-name={a.label} aria-label={`Copy ${a.label} ${a.hex}`}>{a.label}</Chip>;
    case "font": {
      const z = fontZips(a)[0];
      return z ? <Chip glass href={z.href} download="" icon="download">Font files</Chip> : null;
    }
    case "template": {
      const l = site.templateLinks(a)[0];
      return l ? <Chip glass href={l.href} download={l.filename} external={l.external}>{a.label}</Chip> : null;
    }
    default: {
      const href = site.assetHref(a);
      return href ? <Chip glass href={href}>{a.label}</Chip> : null;
    }
  }
}

function LogoWell({ logo }: { logo: LogoAsset }) {
  const site = useSite();
  const f = logoImage(logo);
  return f ? <img src={site.urlFor(f.path)} alt={logo.label} loading="lazy" /> : null;
}

const groundFor = (site: ReturnType<typeof useSite>, l: LogoAsset) => (l.background === "dark" ? { background: darkGround(site) } : undefined);

function QuickCard({ asset: a }: { asset: Asset }) {
  const site = useSite();
  switch (a.type) {
    case "logo": {
      const [png, svg] = logoDownloads(site, a);
      return (
        <AssetCard
          title={a.label}
          help={a.help}
          well={<LogoWell logo={a} />}
          wellStyle={groundFor(site, a)}
          actions={
            <>
              {png && <DownloadButton d={png} variant="primary" size="sm" short bare assetLabel={a.label} />}
              {svg && <DownloadButton d={svg} size="sm" short bare assetLabel={a.label} />}
            </>
          }
        />
      );
    }
    case "color":
      return <QuickColor color={a} />;
    case "font":
      return <QuickFont font={a} />;
    case "template":
      return <QuickTemplate template={a} />;
    default: {
      const href = site.assetHref(a);
      return <AssetCard title={a.label} help={a.help} actions={href && <Button size="sm" href={href}>Open</Button>} />;
    }
  }
}

function QuickColor({ color: c }: { color: ColorAsset }) {
  return (
    <AssetCard
      className="quick-color"
      title={c.label}
      well={null}
      wellStyle={{ background: c.hex }}
    >
      <ColorRows color={c} rows={colorRows(c).filter((r) => r.use !== "RGB")} />
    </AssetCard>
  );
}

function Specimen({ font, sample }: { font: FontAsset; sample: string }) {
  const family = `"${font.family}", var(--font-sans)`;
  return (
    <div className="font-specimen" aria-hidden="true">
      <span className="font-specimen-aa" style={{ fontFamily: family }}>Aa</span>
      <span className="font-specimen-line" style={{ fontFamily: family }}>{sample}</span>
    </div>
  );
}

function QuickFont({ font: f }: { font: FontAsset }) {
  const site = useSite();
  const z = fontZips(f)[0];
  return (
    <AssetCard
      title={f.label}
      help={f.help}
      well={<Specimen font={f} sample={site.brand.name} />}
      wellStyle={{ placeItems: "center start" }}
      actions={z && <Button size="sm" href={z.href} download icon="download" aria-label={`Font files: ${f.label}`}>Font files</Button>}
    />
  );
}

function QuickTemplate({ template: t }: { template: TemplateAsset }) {
  const site = useSite();
  return (
    <AssetCard
      title={t.label}
      help={t.help}
      well={<img className="well-thumb" src={site.urlFor(t.thumbnail)} alt="" loading="lazy" />}
      actions={site.templateLinks(t).map((l, i) => (
        <Button key={l.format} size="sm" variant={i === 0 && l.format === "canva" ? "primary" : "secondary"} href={l.href} external={l.external} download={l.filename} aria-label={`${l.label}: ${t.label}`}>
          {l.label}
        </Button>
      ))}
    />
  );
}

function Preview({ id, title, more, children }: { id: string; title: string; more: { href: string; label: string }; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="section-row">
        <h2 className="library-section-title" id={id}>{title}</h2>
        <a className="section-link" href={more.href}>
          {more.label}
          <Icon name="arrow-right" size={16} />
        </a>
      </div>
      {children}
    </section>
  );
}

function CategoryPreviews() {
  const site = useSite();
  const out: ReactNode[] = [];
  for (const m of site.modules) {
    const more = { href: `${m.route}/`, label: `All ${m.label.toLowerCase()}` };
    if (m.id === "logos") {
      const logos = site.assetsOfType("logo").slice(0, 4);
      if (logos.length)
        out.push(
          <Preview key={m.id} id="preview-logos" title={m.label} more={more}>
            <div className="library-grid preview-logos">
              {logos.map((l) => <AssetCard key={l.id} title={l.label} help={l.help} well={<LogoWell logo={l} />} wellStyle={groundFor(site, l)} />)}
            </div>
          </Preview>,
        );
    } else if (m.id === "colors") {
      const colors = site.assetsOfType("color").slice(0, 8);
      if (colors.length)
        out.push(
          <Preview key={m.id} id="preview-colors" title={m.label} more={more}>
            <ul className="swatch-grid" role="list">
              {colors.map((c) => (
                <li key={c.id}>
                  <button className="swatch-tile" type="button" data-copy={c.hex} data-copy-name={c.label} aria-label={`Copy ${c.label} ${c.hex}`}>
                    <span className="swatch-tile-color" style={{ background: c.hex }} />
                    <span className="swatch-tile-text">
                      <span className="swatch-tile-name">{c.label}</span>
                      <span className="swatch-tile-hex">{c.hex}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Preview>,
        );
    } else if (m.id === "fonts") {
      const fonts = site.assetsOfType("font").slice(0, 4);
      if (fonts.length)
        out.push(
          <Preview key={m.id} id="preview-fonts" title={m.label} more={more}>
            <div className="library-grid">
              {fonts.map((f) => <AssetCard key={f.id} title={f.label} help={f.help} well={<Specimen font={f} sample={site.brand.name} />} wellStyle={{ placeItems: "center start" }} />)}
            </div>
          </Preview>,
        );
    } else if (m.id === "icons") {
      const all = site.assetsOfType("icon");
      const icons = [...all.filter((i) => i.pinned), ...all.filter((i) => !i.pinned)].slice(0, 12);
      if (icons.length)
        out.push(
          <Preview key={m.id} id="preview-icons" title={m.label} more={more}>
            <ul className="icon-row" role="list">
              {icons.map((i) => <li key={i.id}><IconLink icon={i} /></li>)}
            </ul>
          </Preview>,
        );
    } else if (m.id === "templates") {
      const templates = site.assetsOfType("template").filter((t) => site.templateLinks(t).length > 0).slice(0, 4);
      if (templates.length)
        out.push(
          <Preview key={m.id} id="preview-templates" title={m.label} more={more}>
            <div className="library-grid">
              {templates.map((t) => <AssetCard key={t.id} title={t.label} help={t.help} well={<img className="well-thumb" src={site.urlFor(t.thumbnail)} alt="" loading="lazy" />} />)}
            </div>
          </Preview>,
        );
    }
  }
  return <>{out}</>;
}

function IconLink({ icon: i }: { icon: IconAsset }) {
  const site = useSite();
  return (
    <a className="icon-link" href={`${MODULES.icons.route}/#${i.id}`}>
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: site.iconMarkup(i, 24) }} />
      <span>{i.label}</span>
    </a>
  );
}

export function HomePage() {
  const site = useSite();
  const quick = site.brand.quickDownloads
    .map((id) => site.findAsset(id))
    .filter((a): a is Asset => !!a && !!site.assetHref(a) && !(a.type === "template" && !site.templateLinks(a).length));
  return (
    <>
      <Hero />
      <div className="library home-sections">
        {quick.length > 0 && (
          <section aria-labelledby="quick-downloads">
            <h2 className="library-section-title" id="quick-downloads">Quick downloads</h2>
            <div className="library-grid quick-grid">
              {quick.map((a) => <QuickCard key={a.id} asset={a} />)}
            </div>
          </section>
        )}
        <CategoryPreviews />
      </div>
    </>
  );
}
