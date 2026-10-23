// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/admin/editor/svg.ts";

describe("sanitizeSvg", () => {
  it("removes scripts, handlers, embedded content, and outside links, and says so", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="alert(1)">
      <script>alert(1)</script>
      <foreignObject><div>hi</div></foreignObject>
      <image href="https://evil.example/x.png"/>
      <use xlink:href="#a"/>
      <path id="a" d="M0 0h24" fill="#1e5b4a" onclick="x()"/>
    </svg>`;
    const r = sanitizeSvg(dirty);
    expect(r.svg).not.toMatch(/script|foreignObject|onload|onclick|evil\.example/);
    expect(r.svg).toContain('href="#a"');
    expect(r.notes).toEqual([
      "Removed 1 script.",
      "Removed 1 piece of embedded web content.",
      "Removed 2 event handlers.",
      "Removed 1 link to outside files.",
    ]);
    expect(r.colors).toEqual(["#1E5B4A"]);
  });

  it("sets icon colors to currentColor and adds a missing viewBox", () => {
    const r = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M1 1" stroke="#000" fill="none"/></svg>', { icon: true });
    expect(r.svg).toContain('stroke="currentColor"');
    expect(r.svg).toContain('fill="none"');
    expect(r.svg).toContain('viewBox="0 0 24 24"');
    expect(r.notes).toContain("Added a viewBox from the width and height so the file scales cleanly.");
    expect(r.width).toBe(24);
  });

  it("rejects files that are not SVG", () => {
    expect(sanitizeSvg("<html><body>no</body></html>").error).toBe("This file is not a readable SVG.");
  });
});
