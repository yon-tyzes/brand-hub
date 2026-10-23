import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/lib/markdown.ts";
import { fontFaceCss } from "../src/theme/fonts.ts";
import type { FontAsset, TemplateAsset } from "../schemas/asset.ts";
import { templateLinks } from "../src/site/data.ts";

describe("renderMarkdown", () => {
  it("renders paragraphs, lists, bold, code, and links", () => {
    const html = renderMarkdown("Use **one** green `button`.\n\n- First\n- Second\n\n1. Open [the guide](/guide)\n2. Read [more](https://example.com)");
    expect(html).toBe(
      '<p>Use <strong>one</strong> green <code>button</code>.</p>\n<ul><li>First</li><li>Second</li></ul>\n<ol><li>Open <a href="/guide">the guide</a></li><li>Read <a href="https://example.com">more</a></li></ol>',
    );
  });

  it("escapes HTML and ignores unsafe link schemes", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"> [x](javascript:alert(1))');
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript');
    expect(html).toContain("&lt;img");
  });
});

describe("fontFaceCss", () => {
  const base = {
    id: "inter", type: "font", label: "Inter", status: "locked", version: "1.0", updated: "2026-10-22", audience: "public",
    family: "Inter", role: "body", license: "OFL-1.1", install: "x",
  } as const;
  const url = (p: string) => `/${p}`;

  it("uses the variable file over the weight range when there is one", () => {
    const f: FontAsset = { ...base, weights: [400, 700], files: { static: ["a.woff2"], variable: ["v.woff2"] } };
    expect(fontFaceCss([f], url)).toBe('@font-face{font-family:"Inter";src:url("/v.woff2") format("woff2");font-weight:400 700;font-style:normal;font-display:swap}');
  });

  it("maps static files to weights by position", () => {
    const f: FontAsset = { ...base, weights: [400, 600], files: { static: ["r.woff2", "s.ttf", "extra.otf"], variable: [] } };
    const css = fontFaceCss([f], url).split("\n");
    expect(css).toHaveLength(2);
    expect(css[1]).toContain('src:url("/s.ttf") format("truetype");font-weight:600');
  });
});

describe("templateLinks", () => {
  const base = {
    id: "template-letterhead", label: "Letterhead", status: "locked", version: "1.0", updated: "2026-10-23", audience: "public",
    type: "template", category: "Print", thumbnail: "files/templates/letterhead.svg", rules: [] as string[],
  } as const;
  const url = (p: string) => `/files/${p}`;

  it("puts Canva first, then Word, PowerPoint, and PDF, and only the formats a template has", () => {
    const t: TemplateAsset = { ...base, formats: { pdf: "files/templates/a.pdf", canva: "https://www.canva.com/design/x/view", pptx: "files/templates/a.pptx" } };
    expect(templateLinks(t, url).map((l) => l.label)).toEqual(["Open in Canva", "PowerPoint", "PDF"]);
    expect(templateLinks(t, url)[2]).toEqual({ format: "pdf", label: "PDF", href: "/files/files/templates/a.pdf", external: false, filename: "a.pdf" });
  });

  it("reads a 0.1 url as one Open template link, only when no format is set", () => {
    const legacy: TemplateAsset = { ...base, formats: {}, url: "https://www.canva.com/design/x/view" };
    expect(templateLinks(legacy, url)).toEqual([{ format: "link", label: "Open template", href: legacy.url, external: true }]);
    expect(templateLinks({ ...legacy, formats: { pdf: "files/templates/a.pdf" } }, url).map((l) => l.label)).toEqual(["PDF"]);
  });
});
