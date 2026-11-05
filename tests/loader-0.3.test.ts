// 0.3 data keys (ENGINE_SPEC.md, section 14): signature.json, onboarding.json, modules.office in brand.json, and
// gradient records in colors.json. Each test breaks the fixture brand in one way and checks the message.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { GradientAsset } from "../schemas/asset.ts";
import { headshotOf } from "../schemas/signature.ts";
import { checkBrand } from "../src/content/check.ts";
import { diskSource, loadBrand } from "../src/content/load.ts";
import { gradientCss } from "../src/site/library.ts";
import { demoCopy, edit, write } from "./helpers.ts";

const signature = () => ({
  fields: [
    { id: "name", label: "Name", required: true },
    { id: "email", label: "Email", kind: "email" },
  ],
  designs: [
    {
      id: "classic",
      label: "Classic",
      template: "files/signatures/classic.html",
      fields: ["name", "email"],
      headshot: true,
      variants: [
        { id: "green", label: "Green", colors: { accent: "comet-green" } },
        { id: "white", label: "White", colors: { accent: "kiln-white" } },
      ],
    },
  ],
});

/** A fixture copy with signature.json and its template file. */
function withSignature(data: unknown = signature(), template = true) {
  const { brandDir } = demoCopy();
  mkdirSync(join(brandDir, "files", "signatures"), { recursive: true });
  if (template) writeFileSync(join(brandDir, "files", "signatures", "classic.html"), "<table><tr><td>{{name}}</td></tr></table>");
  write(brandDir, "signature.json", JSON.stringify(data));
  return brandDir;
}

const onboarding = () => ({
  steps: [
    { id: "fonts", title: "Install the fonts", links: [{ module: "fonts" }, { asset: "inter" }] },
    { id: "colors", title: "Learn the colors", body: "Two colors.", links: [{ asset: "comet-green" }] },
  ],
});

function withOnboarding(data: unknown = onboarding()) {
  const { brandDir } = demoCopy();
  write(brandDir, "onboarding.json", JSON.stringify(data));
  return brandDir;
}

const office = (colors: Record<string, string> = {}) => ({
  themeName: "Pocket Comet",
  colors: {
    dk1: "comet-green", lt1: "kiln-white", dk2: "comet-green", lt2: "kiln-white",
    accent1: "comet-green", accent2: "kiln-white", accent3: "comet-green", accent4: "kiln-white", accent5: "comet-green", accent6: "kiln-white",
    hlink: "comet-green", folHlink: "comet-green",
    ...colors,
  },
  fonts: { major: "inter", minor: "inter" },
});

const gradient = (extra: Record<string, unknown> = {}) => ({
  id: "comet-dusk", type: "gradient", label: "Comet dusk", status: "locked", version: "1.0", updated: "2026-10-30", audience: "public",
  stops: [{ hex: "#1C2430" }, { hex: "#1E5B4A" }],
  ...extra,
});

describe("0.2.2 data", () => {
  it("loads with no warnings and no 0.3 content", () => {
    const { brandDir } = demoCopy();
    const c = loadBrand(brandDir);
    expect(c.warnings).toEqual([]);
    expect(c.signature).toBeUndefined();
    expect(c.onboarding).toBeUndefined();
    expect(c.brand.modules.office).toBeUndefined();
  });
});

describe("signature.json", () => {
  it("loads designs, fields, and variants with defaults", () => {
    const c = loadBrand(withSignature());
    expect(c.signature?.fields.map((f) => [f.id, f.kind, f.required])).toEqual([["name", "text", true], ["email", "email", false]]);
    expect(c.signature?.designs[0]).toMatchObject({ id: "classic", headshot: true, variants: [{ id: "green" }, { id: "white" }] });
  });

  it("fails on a design field that is not in fields, naming the design", () => {
    const s = signature();
    s.designs[0]!.fields.push("phone");
    expect(() => loadBrand(withSignature(s))).toThrow(/signature\.json {2}id "classic": designs\.0\.fields: field "phone" is not in fields/);
  });

  it("fails on a variant color that does not exist or is not locked", () => {
    const s = signature();
    s.designs[0]!.variants[0]!.colors.accent = "plum";
    expect(() => loadBrand(withSignature(s))).toThrow(/designs\.0\.variants\.0\.colors\.accent: color "plum" does not exist/);

    const brandDir = withSignature();
    edit(brandDir, "colors.json", (cs: any[]) => void (cs.find((c) => c.id === "kiln-white").status = "pending"));
    const { problems } = checkBrand(diskSource(brandDir));
    expect(problems.map((p) => p.problem)).toContainEqual(expect.stringMatching(/variants\.1\.colors\.accent: color "kiln-white" is pending/));
  });

  it("reads a headshot as true (a 72px circle) or a shape and size", () => {
    const s: any = signature();
    expect(headshotOf(loadBrand(withSignature(s)).signature!.designs[0]!)).toEqual({ shape: "circle", width: 72, height: 72 });
    s.designs[0].headshot = { shape: "rect", width: 80, height: 100 };
    expect(headshotOf(loadBrand(withSignature(s)).signature!.designs[0]!)).toEqual({ shape: "rect", width: 80, height: 100 });
    s.designs[0].headshot = false;
    expect(headshotOf(loadBrand(withSignature(s)).signature!.designs[0]!)).toBeUndefined();
  });

  it("fails on a circle headshot with unequal sides", () => {
    const s: any = signature();
    s.designs[0].headshot = { shape: "circle", width: 72, height: 90 };
    expect(() => loadBrand(withSignature(s))).toThrow(/a circle needs the same width and height/);
  });

  it("fails on a missing template file", () => {
    expect(() => loadBrand(withSignature(signature(), false))).toThrow(/designs\.0\.template: file not found/);
  });

  it("fails on duplicate field, design, and variant ids", () => {
    const s = signature();
    s.fields[1]!.id = "name";
    s.designs[0]!.variants[1]!.id = "green";
    s.designs.push({ ...s.designs[0]!, fields: ["name"] });
    const { problems } = checkBrand(diskSource(withSignature(s)));
    const text = problems.map((p) => p.problem).join("\n");
    expect(text).toMatch(/field ids must be unique/);
    expect(text).toMatch(/variant ids must be unique/);
    expect(text).toMatch(/design ids must be unique/);
  });

  it("fails on the 0.2 array shape with a pointer to the new one", () => {
    expect(() => loadBrand(withSignature([]))).toThrow(/signature\.json: holds 0\.2 signature-layout records.*section 14/);
  });

  it("loads a 0.2 signature-layout record in assets.json with a warning", () => {
    const { brandDir } = demoCopy();
    write(
      brandDir,
      "assets.json",
      JSON.stringify([
        {
          id: "sig-basic", type: "signature-layout", label: "Basic", status: "locked", version: "1.0", updated: "2026-10-30", audience: "internal",
          name: "Basic", html: "<p>{{name}}</p>", fields: [{ key: "name", label: "Name" }], fixed: { address: "1 Example Road", website: "https://example.com" },
        },
      ]),
    );
    const c = loadBrand(brandDir);
    expect(c.warnings).toEqual([expect.objectContaining({ id: "sig-basic", problem: "signature-layout records are not used from 0.3" })]);
  });
});

describe("onboarding.json", () => {
  it("loads steps in order", () => {
    const c = loadBrand(withOnboarding());
    expect(c.onboarding?.steps.map((s) => s.id)).toEqual(["fonts", "colors"]);
    expect(c.warnings).toEqual([]);
  });

  it("fails on a link to an asset that does not exist, and on an unknown module", () => {
    const o = onboarding();
    o.steps[1]!.links = [{ asset: "plum" }];
    expect(() => loadBrand(withOnboarding(o))).toThrow(/onboarding\.json {2}id "colors": steps\.1\.links\.0\.asset: asset "plum" does not exist/);

    const bad = onboarding() as any;
    bad.steps[0].links = [{ module: "calendar" }];
    expect(() => loadBrand(withOnboarding(bad))).toThrow(/onboarding\.json: steps\.0\.links\.0/);
  });

  it("warns on a link to an asset that is not locked", () => {
    const brandDir = withOnboarding();
    edit(brandDir, "colors.json", (cs: any[]) => void (cs.find((c) => c.id === "comet-green").status = "draft"));
    const c = loadBrand(brandDir);
    expect(c.warnings).toEqual([expect.objectContaining({ id: "colors", field: "steps.1.links.0.asset" })]);
  });

  it("fails on duplicate step ids and on a step with no links", () => {
    const o = onboarding() as any;
    o.steps[1].id = "fonts";
    o.steps[0].links = [];
    const text = checkBrand(diskSource(withOnboarding(o))).problems.map((p) => p.problem).join("\n");
    expect(text).toMatch(/step ids must be unique/);
    expect(text).toMatch(/steps\.0\.links/);
  });
});

describe("modules.office in brand.json", () => {
  const withOffice = (o: unknown) => {
    const { brandDir } = demoCopy();
    edit(brandDir, "brand.json", (b: any) => void (b.modules = { office: o }));
    return brandDir;
  };

  it("loads a theme whose slots name locked colors and fonts", () => {
    expect(loadBrand(withOffice(office())).brand.modules.office?.fonts).toEqual({ major: "inter", minor: "inter" });
  });

  it("fails on a slot that names a missing color or font, naming the slot", () => {
    expect(() => loadBrand(withOffice(office({ accent3: "plum" })))).toThrow(/modules\.office\.colors\.accent3: color "plum" does not exist/);
    expect(() => loadBrand(withOffice({ ...office(), fonts: { major: "inter", minor: "lora" } }))).toThrow(/modules\.office\.fonts\.minor: font "lora" does not exist/);
  });

  it("fails on a slot that names a pending color", () => {
    const brandDir = withOffice(office());
    edit(brandDir, "colors.json", (cs: any[]) => void (cs.find((c) => c.id === "kiln-white").status = "pending"));
    expect(() => loadBrand(brandDir)).toThrow(/modules\.office\.colors\.lt1: color "kiln-white" is pending/);
  });

  it("fails when a slot is left out", () => {
    const o = office() as any;
    delete o.colors.folHlink;
    expect(() => loadBrand(withOffice(o))).toThrow(/modules\.office\.colors\.folHlink/);
  });
});

describe("gradient records in colors.json", () => {
  const withGradient = (g: unknown) => {
    const { brandDir } = demoCopy();
    edit(brandDir, "colors.json", (cs: unknown[]) => [...cs, g]);
    return brandDir;
  };

  it("loads a gradient next to the colors, angle 90 by default", () => {
    const g = loadBrand(withGradient(gradient())).assets.find((a) => a.id === "comet-dusk");
    expect(g).toMatchObject({ type: "gradient", angle: 90, stops: [{ hex: "#1C2430" }, { hex: "#1E5B4A" }] });
  });

  it("fails on fewer than two stops, a bad hex, and mixed or falling positions", () => {
    const problems = (g: unknown) => checkBrand(diskSource(withGradient(g))).problems.map((p) => p.problem).join("\n");
    expect(problems(gradient({ stops: [{ hex: "#1C2430" }] }))).toMatch(/stops/);
    expect(problems(gradient({ stops: [{ hex: "#1C2430" }, { hex: "green" }] }))).toMatch(/stops\.1\.hex: must be a 6-digit hex color/);
    expect(problems(gradient({ stops: [{ hex: "#1C2430", at: 0 }, { hex: "#1E5B4A" }] }))).toMatch(/set at on every stop or on none/);
    expect(problems(gradient({ stops: [{ hex: "#1C2430", at: 60 }, { hex: "#1E5B4A", at: 40 }] }))).toMatch(/stop positions \(at\) must not go down/);
  });

  it("does not belong in another split file", () => {
    const { brandDir } = demoCopy();
    write(brandDir, "logos.json", JSON.stringify([gradient()]));
    expect(() => loadBrand(brandDir)).toThrow(/type "gradient" does not belong in logos\.json/);
  });
});

describe("gradient CSS", () => {
  const g = (stops: { hex: string; at?: number }[], angle = 90) => ({ ...gradient(), angle, stops }) as GradientAsset;

  it("lists the stops in order, with positions only when set", () => {
    expect(gradientCss(g([{ hex: "#1C2430" }, { hex: "#1E5B4A" }]))).toBe("linear-gradient(90deg, #1C2430, #1E5B4A)");
    expect(gradientCss(g([{ hex: "#1C2430", at: 0 }, { hex: "#1E5B4A", at: 70 }], 180))).toBe("linear-gradient(180deg, #1C2430 0%, #1E5B4A 70%)");
  });
});
