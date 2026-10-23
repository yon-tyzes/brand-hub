// The preview area of an asset card. Rendered to static HTML on public pages (no hydration, no JS)
// and live in the editor, so both show an item the same way.
import type { AnyRecord } from "../../../schemas/asset.ts";
import { uiIconSvg } from "../../lib/ui-icons.ts";

interface Props {
  record: AnyRecord;
  /** URL for a file path in the brand folder (public: /files/...; editor: uploads use object URLs). */
  urlFor: (path: string) => string;
  /** SVG markup for icon files, when the caller has it inline. */
  svgFor?: (path: string) => string | undefined;
  /** Overrides a logo's own background. */
  bg?: "light" | "dark";
  /** Alt text for logo images; decorative elsewhere. */
  alt?: string;
}

const RASTER = ["svg", "png", "jpg", "jpeg", "webp", "gif"];

export function AssetPreview({ record: r, urlFor, svgFor, bg, alt }: Props) {
  switch (r.type) {
    case "logo": {
      const file = r.files.find((f) => f.ext === "svg") ?? r.files.find((f) => RASTER.includes(f.ext));
      return (
        <div className="logo-preview" data-bg={bg ?? r.background} data-logo-preview="">
          {file && <img src={urlFor(file.path)} alt={alt ?? r.label} loading="lazy" />}
        </div>
      );
    }
    case "color":
      return <div className="swatch" style={{ background: r.hex }} />;
    case "icon": {
      const svg = r.svgPath ? svgFor?.(r.svgPath) : undefined;
      return (
        <div className="asset-icon-preview" aria-hidden="true">
          {svg ? <span dangerouslySetInnerHTML={{ __html: svg }} /> : r.svgPath ? <img src={urlFor(r.svgPath)} alt="" /> : null}
        </div>
      );
    }
    case "template":
      return r.thumbnail ? <img className="template-thumb" src={urlFor(r.thumbnail)} alt="" loading="lazy" /> : <div className="template-thumb" />;
    case "font":
      return (
        <div className="font-preview" style={{ fontFamily: `"${r.family}", var(--font-sans)` }} aria-hidden="true">
          Aa
        </div>
      );
    default: {
      const icon = r.type === "photo-source" ? "image" : r.type === "rule" ? "book" : "layout";
      return <div className="asset-icon-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: uiIconSvg(icon, 32) }} />;
    }
  }
}
