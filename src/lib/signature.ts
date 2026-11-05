// Email signature rendering (ENGINE_SPEC.md, section 14). Pure, so the build, the page script, and the tests
// share it. Templates are brand data; every value a person types is escaped before it enters one.
import type { SignatureField } from "../../schemas/signature.ts";

export interface SignatureInput {
  /** The design's HTML template. */
  template: string;
  /** Every field in signature.json, for each value's kind. */
  fields: SignatureField[];
  /** Typed values by field id. */
  values: Record<string, string>;
  /** Template color name to hex: { accent: "#1E5B4A" }. */
  colors: Record<string, string>;
  /** The site's address with no trailing slash. Empty renders root-relative paths (build-time previews). */
  site: string;
  /** The headshot as a data URL, when there is one. */
  headshot?: string;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for HTML content and quoted attributes alike. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

/** A site address with no trailing slash. */
export const siteAddress = (url: string | URL | undefined) => (url ? String(url).replace(/\/+$/, "") : "");

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * A field's value as the signature uses it, or "" when it has none. A `url` value must be http or https; one
 * with no scheme gets https. Anything else (javascript:, data:) counts as empty.
 */
export function cleanValue(field: Pick<SignatureField, "kind"> | undefined, raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || field?.kind !== "url") return v;
  if (!SCHEME.test(v)) return `https://${v}`;
  return /^https?:\/\//i.test(v) ? v : "";
}

/** The link a field's value opens: mailto: for email, tel: for phone, the address itself for url. */
export function hrefFor(field: Pick<SignatureField, "kind"> | undefined, value: string): string {
  if (!value) return "";
  switch (field?.kind) {
    case "email": return `mailto:${value}`;
    case "phone": {
      const digits = value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
      return digits ? `tel:${digits}` : "";
    }
    case "url": return value;
    default: return "";
  }
}

const SECTION = /\{\{#([a-z0-9-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TOKEN = /\{\{\s*([a-z0-9.-]+)\s*\}\}/g;

/**
 * Fills a template: `{{#id}} ... {{/id}}` sections keep their content only when the field (or `headshot`) has a
 * value; `{{id}}`, `{{href.id}}`, `{{color.name}}`, `{{site}}`, and `{{headshot}}` become their escaped values.
 * Unknown tokens render as nothing. A root-relative `src` or `href` is made absolute from the site address.
 */
export function renderSignature({ template, fields, values, colors, site, headshot }: SignatureInput): string {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const value = (id: string) => cleanValue(byId.get(id), values[id]);
  const has = (key: string) => (key === "headshot" ? !!headshot : !!value(key));

  let html = template;
  for (let prev = ""; prev !== html; ) {
    prev = html;
    html = html.replace(SECTION, (_, key: string, inner: string) => (has(key) ? inner : ""));
  }
  html = html.replace(TOKEN, (_, token: string) => {
    if (token === "site") return escapeHtml(site);
    if (token === "headshot") return escapeHtml(headshot ?? "");
    if (token.startsWith("color.")) return escapeHtml(colors[token.slice(6)] ?? "");
    if (token.startsWith("href.")) {
      const id = token.slice(5);
      return escapeHtml(hrefFor(byId.get(id), value(id)));
    }
    return escapeHtml(value(token));
  });
  return html.replace(/\b(src|href)="\/(?!\/)/g, (_, attr: string) => `${attr}="${escapeHtml(site)}/`);
}

/** The plain text fallback: each filled value in the design's form order, one per line, then the site address. */
export function plainSignature(fieldIds: string[], fields: SignatureField[], values: Record<string, string>, site: string): string {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const lines = fieldIds.map((id) => cleanValue(byId.get(id), values[id])).filter(Boolean);
  return [...lines, site].filter(Boolean).join("\n");
}

/** Sample values for an empty form and the design thumbnails: each field's own label, so no copy is invented. */
export const sampleValues = (fields: SignatureField[]) =>
  Object.fromEntries(fields.map((f) => [f.id, f.kind === "url" ? "" : f.label]));
