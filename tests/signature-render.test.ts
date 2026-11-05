// Signature rendering (ENGINE_SPEC.md, section 14): escaped values, absolute image URLs, sections, and links.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SignatureField } from "../schemas/signature.ts";
import { cleanValue, hrefFor, plainSignature, renderSignature, sampleValues } from "../src/lib/signature.ts";

const fields: SignatureField[] = [
  { id: "name", label: "Name", kind: "text", required: true },
  { id: "email", label: "Email", kind: "email", required: true },
  { id: "phone", label: "Phone", kind: "phone", required: false },
  { id: "website", label: "Website", kind: "url", required: false },
];
const site = "https://hub.example.test";
const render = (template: string, values: Record<string, string>, headshot?: string) =>
  renderSignature({ template, fields, values, colors: { accent: "#1E5B4A" }, site, headshot });
const demoTemplate = (design: string) => readFileSync(new URL(`../brands/demo/files/signatures/${design}.html`, import.meta.url), "utf8");

describe("renderSignature", () => {
  it("escapes every value in text and attributes", () => {
    const html = render('<p title="{{name}}">{{name}}</p><a href="{{href.email}}">{{email}}</a>', {
      name: `Ada "Lux" <script>alert(1)</script> & Co's`,
      email: `a"onmouseover="x@example.test`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &quot;Lux&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co&#39;s");
    expect(html).toContain('href="mailto:a&quot;onmouseover=&quot;x@example.test"');
  });

  it("makes image URLs absolute from the site address", () => {
    const html = render('<img src="{{site}}/files/logo.png" alt="Logo"><img src="/files/mark.png" alt="Mark">', { name: "Ada" });
    expect(html).toContain(`src="${site}/files/logo.png"`);
    expect(html).toContain(`src="${site}/files/mark.png"`);
    expect(html).not.toMatch(/src="\//);
  });

  it.each(["classic", "compact"])("gives every image in the demo %s template alt text and an absolute URL", (design) => {
    const html = render(demoTemplate(design), { name: "Ada Quill", email: "ada@example.test" }, "data:image/png;base64,AAAA");
    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img).toMatch(/\balt="[^"]+"/);
      expect(img).toMatch(/\bsrc="(https:\/\/|data:image\/png)/);
    }
  });

  it("leaves the headshot out when there is none", () => {
    const template = "{{#headshot}}<img src=\"{{headshot}}\" alt=\"{{name}}\">{{/headshot}}<b>{{name}}</b>";
    expect(render(template, { name: "Ada" })).toBe("<b>Ada</b>");
    expect(render(template, { name: "Ada" }, "data:image/png;base64,AAAA")).toBe('<img src="data:image/png;base64,AAAA" alt="Ada"><b>Ada</b>');
  });

  it("keeps a section only when its field has a value, and drops unknown tokens", () => {
    const template = "{{name}}{{#phone}}, {{phone}}{{/phone}}{{nope}}";
    expect(render(template, { name: "Ada", phone: "  " })).toBe("Ada");
    expect(render(template, { name: "Ada", phone: "+1 555 0100" })).toBe("Ada, +1 555 0100");
  });

  it("builds tel: and mailto: links, and keeps url fields to http and https", () => {
    expect(hrefFor(fields[2], "+1 (555) 010-0199 ext")).toBe("tel:+15550100199");
    expect(hrefFor(fields[1], "ada@example.test")).toBe("mailto:ada@example.test");
    expect(cleanValue(fields[3], "javascript:alert(1)")).toBe("");
    expect(cleanValue(fields[3], "data:text/html,x")).toBe("");
    expect(cleanValue(fields[3], "example.test")).toBe("https://example.test");
    expect(cleanValue(fields[3], "http://example.test/a")).toBe("http://example.test/a");
    expect(render('{{#website}}<a href="{{href.website}}">{{website}}</a>{{/website}}', { website: "javascript:alert(1)" })).toBe("");
  });
});

describe("plainSignature", () => {
  it("lists filled values in form order, then the site address", () => {
    expect(plainSignature(["name", "phone", "email"], fields, { name: "Ada", email: "ada@example.test", phone: "" }, site))
      .toBe(`Ada\nada@example.test\n${site}`);
  });

  it("samples each field by its own label", () => {
    expect(sampleValues(fields)).toEqual({ name: "Name", email: "Email", phone: "Phone", website: "" });
  });
});
