// Shared public components (docs/DESIGN_SYSTEM.md). Rendered to static HTML by Astro on the site, with no
// hydration, and rendered live by the editor's preview. Behavior comes from src/scripts/*, not from React.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { ColorAsset, RuleAsset } from "../../schemas/asset.ts";
import { renderMarkdown } from "../lib/markdown.ts";
import { uiIconSvg } from "../lib/ui-icons.ts";
import type { Site } from "./data.ts";
import type { ColorRow, Download, RuleStripData } from "./library.ts";

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
  /** One primary per view (DESIGN_SYSTEM.md, Button). "text" is the 0.1 name for ghost. */
  variant?: "primary" | "secondary" | "ghost" | "text";
  size?: "md" | "sm";
  href?: string;
  icon?: string;
  iconEnd?: string;
  /** Format shown beside the label, in small type: "For Word and PowerPoint" PNG. */
  format?: string;
  /** Read after the visible label, hidden on screen: which item the button is for. */
  suffix?: string;
  /** Opens in a new tab with an announced hint. */
  external?: boolean;
  download?: string | true;
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  "aria-label"?: string;
} & Record<`data-${string}`, string | undefined>;

export function Button({ variant = "secondary", size = "md", href, icon, iconEnd, format, suffix, external, download, className, children, type = "button", ...rest }: ButtonProps) {
  const v = variant === "text" ? "ghost" : variant;
  const classes = ["btn", `btn-${v}`, size === "sm" && "btn-sm", className].filter(Boolean).join(" ");
  const end = iconEnd ?? (external ? "external" : undefined);
  const iconSize = 16;
  const body = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {format && <span className="btn-format">{format}</span>}
      {suffix && <span className="visually-hidden">, {suffix}</span>}
    </>
  );
  if (href) {
    return (
      <a className={classes} href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} download={download === true ? "" : download} {...rest}>
        {body}
        {external && <span className="visually-hidden">(opens in a new tab)</span>}
        {end && <Icon name={end} size={iconSize} />}
      </a>
    );
  }
  return (
    <button className={classes} type={type} {...rest}>
      {body}
      {iconEnd && <Icon name={iconEnd} size={iconSize} />}
    </button>
  );
}

/** A button or link that downloads a file, named by use with the format beside it. */
export function DownloadButton({ d, variant = "secondary", size, short, bare, assetLabel }: { d: Download; variant?: "primary" | "secondary"; size?: "md" | "sm"; short?: boolean; bare?: boolean; assetLabel: string }) {
  return (
    <Button variant={variant} size={size} href={d.href} download={d.filename} icon={variant === "primary" ? "download" : undefined} format={bare ? undefined : d.format} suffix={bare ? `${d.format}, ${assetLabel}` : assetLabel}>
      {short ? d.short : (
        <>
          <span className="label-long">{d.label}</span>
          <span className="label-short">{d.short}</span>
        </>
      )}
    </Button>
  );
}

/**
 * Chips (DESIGN_SYSTEM.md, Chip): quick picks and filters. `pressed` makes it a filter toggle. `dot` is the brand
 * color the chip names, the one place brand color appears in a shell control.
 */
export function Chip({ children, href, pressed, dot, icon, glass, download, external, className, ...rest }: {
  children: ReactNode; href?: string; pressed?: boolean; dot?: string; icon?: string; glass?: boolean; download?: string; external?: boolean; className?: string;
} & Record<`data-${string}`, string | undefined> & { "aria-label"?: string }) {
  const classes = ["chip", glass && "chip-glass", className].filter(Boolean).join(" ");
  const body = (
    <>
      {dot && <span className="chip-dot" style={{ background: dot }} aria-hidden="true" />}
      {icon && <Icon name={icon} size={16} />}
      {children}
    </>
  );
  if (href) return <a className={classes} href={href} download={download} {...(external ? { target: "_blank", rel: "noopener" } : {})} {...rest}>{body}</a>;
  return <button className={classes} type="button" aria-pressed={pressed === undefined ? undefined : pressed} {...rest}>{body}</button>;
}

/**
 * An asset card (DESIGN_SYSTEM.md, AssetCard): the real asset in the well, a title, one line on where it is
 * used, and its actions, always visible. Nothing sits above the title.
 */
export function AssetCard({ id, title, help, well, wellStyle, actions, children, headingLevel = 3, size = "md", className }: {
  id?: string; title: ReactNode; help?: string; well?: ReactNode; wellStyle?: CSSProperties; actions?: ReactNode; children?: ReactNode;
  headingLevel?: 2 | 3; size?: "md" | "lg"; className?: string;
}) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <article className={["asset-card", size === "lg" && "asset-card-lg", className].filter(Boolean).join(" ")} id={id}>
      {well !== undefined && <div className="asset-well" style={wellStyle}>{well}</div>}
      <div className="asset-body">
        <H className="asset-title">{title}</H>
        {help && <p className="asset-help">{help}</p>}
        {children}
        {actions && <div className="asset-actions">{actions}</div>}
      </div>
    </article>
  );
}

/** Copyable value rows labeled by use (DESIGN_SYSTEM.md, ColorSwatch). Clicking a row copies its value. */
export function ColorRows({ color, rows, className }: { color: ColorAsset; rows: ColorRow[]; className?: string }) {
  return (
    <ul className={["value-rows", className].filter(Boolean).join(" ")} role="list">
      {rows.map((r) => (
        <li key={r.use} data-use={r.use.toLowerCase()}>
          <button className="value-row" type="button" data-copy={r.value} data-copy-name={color.label}>
            <span className="visually-hidden">Copy </span>
            <span className="value-row-use">{r.use}</span>
            <span className="value-row-icon"><Icon name="copy" size={16} /></span>
            <span className="value-row-value">{r.value}</span>
            <span className="visually-hidden">, {color.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The short strip of rules at the top of a Library page, with a link to the chapter. */
export function RuleStrip({ strip }: { strip?: RuleStripData }) {
  if (!strip) return null;
  return (
    <aside className="rule-strip" aria-label={strip.label}>
      <p className="rule-strip-label">{strip.label}</p>
      {strip.lines.map((l) => <p key={l} className="rule-strip-line">{l}</p>)}
      {strip.link && (
        <a className="rule-strip-link" href={strip.link.href}>
          {strip.link.label}
          <Icon name="arrow-right" size={16} />
        </a>
      )}
    </aside>
  );
}

/** A Library page's title and intro. `introShort` replaces the intro on phones. */
export function LibraryHead({ title, intro, introShort, action }: { title: string; intro?: ReactNode; introShort?: ReactNode; action?: ReactNode }) {
  return (
    <div className="library-head">
      <div>
        <h1 className="library-title">{title}</h1>
        {intro && (
          <p className="library-intro">
            {introShort ? (
              <>
                <span className="label-long">{intro}</span>
                <span className="label-short">{introShort}</span>
              </>
            ) : intro}
          </p>
        )}
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

export function ChangelogEntry({ date, dateLabel, tag, title, detail, href, muted }: { date?: string; dateLabel?: string; tag: string; title: string; detail?: string; href?: string; muted?: boolean }) {
  return (
    <li className="changelog-entry">
      {date ? <time className="caption" dateTime={date}>{dateLabel ?? date}</time> : <span className="caption changelog-nodate" />}
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

/** Shows the theme it switches to: a moon in light, a sun in dark. src/scripts/shell.ts keeps the label current. */
export const ThemeToggle = () => (
  <button className="theme-toggle" type="button" aria-label="Switch to dark theme" data-theme-toggle="">
    <span className="moon"><Icon name="moon" size={18} /></span>
    <span className="sun"><Icon name="sun" size={18} /></span>
  </button>
);
