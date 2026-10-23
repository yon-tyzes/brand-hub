// Shared public components (docs/DESIGN_SYSTEM.md). Rendered to static HTML by Astro on the site, with no
// hydration, and rendered live by the editor's preview. Behavior comes from src/scripts/*, not from React.
import { createContext, useContext, type ReactNode } from "react";
import type { Asset, RuleAsset } from "../../schemas/asset.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { uiIconSvg } from "../lib/ui-icons.ts";
import type { Site } from "./data.ts";

export const SiteContext = createContext<Site | null>(null);
export function useSite(): Site {
  const s = useContext(SiteContext);
  if (!s) throw new Error("useSite outside SiteContext");
  return s;
}

export const Icon = ({ name, size = 20 }: { name: string; size?: number }) => (
  <span className="ui-icon" style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: uiIconSvg(name, size) }} />
);

type ButtonProps = {
  variant?: "primary" | "secondary" | "text";
  size?: "md" | "sm";
  href?: string;
  icon?: string;
  iconEnd?: string;
  /** Opens in a new tab with an announced hint. */
  external?: boolean;
  download?: string | true;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  "aria-label"?: string;
} & Record<`data-${string}`, string | undefined>;

export function Button({ variant = "secondary", size = "md", href, icon, iconEnd, external, download, className, children, type = "button", ...rest }: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, size === "sm" && "btn-sm", className].filter(Boolean).join(" ");
  const end = iconEnd ?? (external ? "external" : undefined);
  if (href) {
    return (
      <a className={classes} href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} download={download === true ? "" : download} {...rest}>
        {icon && <Icon name={icon} />}
        {children}
        {external && <span className="visually-hidden">(opens in a new tab)</span>}
        {end && <Icon name={end} />}
      </a>
    );
  }
  return (
    <button className={classes} type={type} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </button>
  );
}

export const IconTile = ({ name, svg, dense }: { name?: string; svg?: string; dense?: boolean }) => (
  <span className={dense ? "icon-tile icon-tile-sm" : "icon-tile"} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg ?? (name ? uiIconSvg(name) : "") }} />
);

export function SectionHead({ title, intro, id, action }: { title: string; intro?: string; id?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2 id={id}>{title}</h2>
        {intro && <p className="small">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

interface CardProps {
  title: string;
  description?: string;
  href?: string;
  id?: string;
  headingLevel?: 2 | 3;
  preview?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Card({ title, description, href, id, headingLevel = 3, preview, meta, footer, children }: CardProps) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className="card" id={id}>
      {preview && <div className="card-preview">{preview}</div>}
      {meta && <div className="row">{meta}</div>}
      <H className="card-title">{href ? <a className="card-link" href={href}>{title}</a> : title}</H>
      {description && <p className="card-description">{description}</p>}
      {children}
      {footer && <div className="card-footer above-link">{footer}</div>}
    </article>
  );
}

export function Accordion({ items }: { items: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <div className="accordion">
      {items.map((item) => (
        <details id={item.id} key={item.id}>
          <summary>
            <span>{item.title}</span>
            <span className="accordion-toggle" aria-hidden="true" />
          </summary>
          <div className="accordion-body">{item.body}</div>
        </details>
      ))}
    </div>
  );
}

export function ChangelogEntry({ date, dateLabel, tag, title, detail, href, muted }: { date?: string; dateLabel?: string; tag: string; title: string; detail?: string; href?: string; muted?: boolean }) {
  return (
    <li className="changelog-entry">
      {date ? <time className="caption" dateTime={date}>{dateLabel ?? date}</time> : <span className="caption" />}
      <div className="changelog-main">
        <span className={muted ? "tag tag-muted" : "tag"}>{tag}</span>
        <span className="changelog-title">{href ? <a href={href}>{title}</a> : title}</span>
        {detail && <span className="small">{detail}</span>}
      </div>
      {href && (
        <span className="changelog-arrow" aria-hidden="true">
          <Icon name="arrow-right" />
        </span>
      )}
    </li>
  );
}

/** "Rules:" line linking an asset to the rules that govern it. */
export function RuleLinks({ asset }: { asset: Asset }) {
  const site = useSite();
  const rules = site.rulesFor(asset);
  if (!rules.length) return null;
  return (
    <p className="rule-links above-link">
      <span>Rules:</span>
      {rules.map((r) => {
        const href = site.assetHref(r);
        return href ? <a key={r.id} href={href}>{r.label}</a> : <span key={r.id}>{r.label}</span>;
      })}
    </p>
  );
}

export function RuleBody({ rule, level = 3 }: { rule: RuleAsset; level?: 2 | 3 | 4 }) {
  const H = `h${level}` as "h2" | "h3" | "h4";
  return (
    <div className="stack-lg">
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(rule.body) }} />
      {(rule.do.length > 0 || rule.dont.length > 0) && (
        <div className="cells-2 do-dont">
          {rule.do.length > 0 && (
            <div>
              <H className="h4">Do</H>
              <ul>{rule.do.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          )}
          {rule.dont.length > 0 && (
            <div>
              <H className="h4">Don't</H>
              <ul>{rule.dont.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** ARIA tabs markup. src/scripts/tabs.ts adds keyboard and selection; without it every panel shows. */
export function Tabs({ label, idPrefix, tabs }: { label: string; idPrefix: string; tabs: { id: string; label: string; panel: ReactNode }[] }) {
  return (
    <div className="tabs" data-tabs="">
      <div className="tab-list" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button key={t.id} className="tab" type="button" role="tab" id={`${idPrefix}-tab-${t.id}`} aria-controls={`${idPrefix}-panel-${t.id}`} aria-selected={i === 0} tabIndex={i === 0 ? 0 : -1}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} className="tab-panel" role="tabpanel" id={`${idPrefix}-panel-${t.id}`} aria-labelledby={`${idPrefix}-tab-${t.id}`} hidden={i !== 0}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}

/** Filter pills markup. Place inside [data-filter-root]; src/scripts/filter.ts does the filtering. */
export function Pills({ label, options, allCount }: { label: string; options: { value: string; label: string; count?: number }[]; allCount?: number }) {
  return (
    <div className="pills" role="group" aria-label={label} data-filter-pills="">
      <button className="pill" type="button" aria-pressed="true" data-value="all">
        <Icon name="check" size={16} />
        All{allCount !== undefined && <span className="pill-count">{allCount}</span>}
      </button>
      {options.map((o) => (
        <button key={o.value} className="pill" type="button" aria-pressed="false" data-value={o.value}>
          <Icon name="check" size={16} />
          {o.label}
          {o.count !== undefined && <span className="pill-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const ThemeSwitch = () => (
  <button className="theme-switch" type="button" role="switch" aria-checked="false" aria-label="Dark theme" data-theme-switch="">
    <span className="sun"><Icon name="sun" size={16} /></span>
    <span className="moon"><Icon name="moon" size={16} /></span>
  </button>
);
