// Cleans uploaded SVG files in the browser before they enter the change set (docs/ENGINE_SPEC.md, section 7).
// Removes scripts, event handlers, embedded web content, and links to outside files. For icons, also sets
// colors to currentColor and makes sure there is a viewBox. Returns plain notes describing what changed.

export interface SanitizeResult {
  svg: string;
  notes: string[];
  /** Distinct colors used in the file, as uppercase #RRGGBB. */
  colors: string[];
  width?: number;
  height?: number;
  error?: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const REMOVE = ["script", "foreignObject", "iframe", "object", "embed"];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function toHex(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  const short = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v.toUpperCase();
  const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  if (v === "black") return "#000000";
  if (v === "white") return "#FFFFFF";
  return undefined;
}

export function sanitizeSvg(text: string, opts: { icon?: boolean } = {}): SanitizeResult {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (doc.querySelector("parsererror") || root.localName !== "svg") {
    return { svg: "", notes: [], colors: [], error: "This file is not a readable SVG." };
  }
  const notes: string[] = [];

  let removed = 0;
  let embedded = 0;
  for (const tag of REMOVE) {
    for (const el of [...root.getElementsByTagName(tag)]) {
      if (tag === "script") removed++;
      else embedded++;
      el.remove();
    }
  }
  if (removed) notes.push(`Removed ${plural(removed, "script")}.`);
  if (embedded) notes.push(`Removed ${plural(embedded, "piece", "pieces")} of embedded web content.`);

  let handlers = 0;
  let links = 0;
  const colors = new Set<string>();
  let recolored = 0;
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        handlers++;
      } else if ((name === "href" || name === "xlink:href" || name === "src") && !attr.value.trim().startsWith("#")) {
        el.removeAttribute(attr.name);
        links++;
      } else if (name === "style" && /url\(\s*['"]?(?!#)/i.test(attr.value)) {
        el.setAttribute("style", attr.value.replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, "none"));
        links++;
      }
    }
    for (const prop of ["fill", "stroke", "stop-color"]) {
      const value = el.getAttribute(prop);
      if (!value) continue;
      const hex = toHex(value);
      if (hex) colors.add(hex);
      if (opts.icon && prop !== "stop-color" && value !== "none" && value !== "currentColor" && !value.startsWith("url(")) {
        el.setAttribute(prop, "currentColor");
        recolored++;
      }
    }
  }
  if (handlers) notes.push(`Removed ${plural(handlers, "event handler")}.`);
  if (links) notes.push(`Removed ${plural(links, "link")} to outside files.`);
  if (recolored) notes.push("Set the icon's colors to follow the color chosen on the site.");

  const num = (v: string | null) => (v && /^\d+(\.\d+)?(px)?$/.test(v) ? parseFloat(v) : undefined);
  let width = num(root.getAttribute("width"));
  let height = num(root.getAttribute("height"));
  const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    width ??= viewBox[2];
    height ??= viewBox[3];
  } else if (width && height) {
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
    notes.push("Added a viewBox from the width and height so the file scales cleanly.");
  } else if (opts.icon) {
    notes.push("This icon has no size information, so it may not scale cleanly. Ask the designer for a version with a viewBox.");
  }
  if (opts.icon) {
    if (!root.getAttribute("fill")) root.setAttribute("fill", "none");
    root.setAttribute("aria-hidden", "true");
  }
  if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", SVG_NS);

  return { svg: new XMLSerializer().serializeToString(root), notes, colors: [...colors], width, height };
}
