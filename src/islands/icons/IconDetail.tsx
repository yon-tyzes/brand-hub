// Icon detail sheet: previews at 16, 24, 32, 48; recolor with brand icon colors; copy or download SVG;
// download PNG at preset sizes through canvas. Opens from the icon grid or from a #icon-id link.
import { useEffect, useState } from "react";
import { copyText, downloadBlob } from "../../scripts/client.ts";
import { Sheet } from "../Sheet.tsx";

export interface IconData {
  id: string;
  label: string;
  group: string;
  svg: string;
  fileBase: string;
  rules: { label: string; href?: string }[];
}

export interface IconColor {
  id: string;
  label: string;
  hex: string;
}

type IconRequest = { id: string; opener: HTMLElement };
type RequestWindow = Window & { bhIconRequest?: IconRequest };

const PREVIEW_SIZES = [16, 24, 32, 48];
const PNG_SIZES = [64, 128, 256, 512];

function colored(svg: string, hex: string, size?: number): string {
  let out = svg.replace(/currentColor/g, hex).replace(/\saria-hidden="true"/, "");
  if (size) out = out.replace(/\swidth="[^"]*"/, ` width="${size}"`).replace(/\sheight="[^"]*"/, ` height="${size}"`);
  return out;
}

async function pngBlob(svg: string, size: number): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
  canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"));
}

export default function IconDetail({ icons, colors }: { icons: IconData[]; colors: IconColor[] }) {
  const [icon, setIcon] = useState<IconData | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const [colorId, setColorId] = useState(colors[0]?.id ?? "");
  const [pngSize, setPngSize] = useState(PNG_SIZES[2]!);
  const color = colors.find((c) => c.id === colorId) ?? { id: "current", label: "Current color", hex: "currentColor" };

  useEffect(() => {
    const byId = new Map(icons.map((i) => [i.id, i]));
    const fromHash = () => {
      const i = byId.get(decodeURIComponent(location.hash.slice(1)));
      if (i) {
        setOpener(document.querySelector<HTMLElement>(`[data-icon-id="${i.id}"]`));
        setIcon(i);
      }
    };
    const open = ({ id, opener }: IconRequest) => {
      setOpener(opener);
      setIcon(byId.get(id) ?? null);
    };
    const onOpen = (e: Event) => open((e as CustomEvent<IconRequest>).detail);
    window.addEventListener("bh:icon-open", onOpen);
    window.addEventListener("hashchange", fromHash);
    // A click before hydration leaves its request on window.
    const early = (window as RequestWindow).bhIconRequest;
    if (early) open(early);
    else fromHash();
    return () => {
      window.removeEventListener("bh:icon-open", onOpen);
      window.removeEventListener("hashchange", fromHash);
    };
  }, [icons]);

  const close = () => {
    (window as RequestWindow).bhIconRequest = undefined;
    setIcon(null);
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  };

  if (!icon) return <Sheet open={false} title="" onClose={close}>{null}</Sheet>;
  const svg = colored(icon.svg, color.hex);
  const suffix = color.id === "current" ? "" : `-${color.id}`;

  return (
    <Sheet open title={icon.label} onClose={close} returnFocus={opener}>
      <section aria-label="Previews" className="row" style={{ alignItems: "end", gap: "var(--space-5)" }}>
        {PREVIEW_SIZES.map((s) => (
          <figure key={s} className="stack" style={{ justifyItems: "center" }}>
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: colored(icon.svg, color.hex, s) }} />
            <figcaption className="caption">{s} px</figcaption>
          </figure>
        ))}
      </section>

      {colors.length > 0 && (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="card-title" style={{ marginBottom: "var(--space-2)" }}>Color</legend>
          <div className="pills">
            {colors.map((c) => (
              <label key={c.id} className="pill" style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name="icon-color"
                  value={c.id}
                  checked={c.id === colorId}
                  onChange={() => setColorId(c.id)}
                  style={{ accentColor: c.hex, margin: 0, width: 16, height: 16 }}
                />
                <span className="swatch-dot" style={{ background: c.hex, width: 16, height: 16, borderRadius: 4 }} aria-hidden="true" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <section aria-label="Export" className="stack">
        <div className="row">
          <button className="btn btn-primary btn-sm" type="button" onClick={() => copyText(colored(icon.svg, color.hex, 24), `${icon.label} icon SVG in ${color.label} copied.`)}>
            Copy SVG
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${icon.fileBase}${suffix}.svg`)}>
            Download SVG
          </button>
        </div>
        <div className="row">
          <label className="small" htmlFor="png-size">PNG size</label>
          <select id="png-size" className="field" style={{ width: "auto", minHeight: 40, padding: "6px 12px" }} value={pngSize} onChange={(e) => setPngSize(Number(e.target.value))}>
            {PNG_SIZES.map((s) => <option key={s} value={s}>{s} px</option>)}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={async () => downloadBlob(await pngBlob(colored(icon.svg, color.hex === "currentColor" ? "#000000" : color.hex, pngSize), pngSize), `${icon.fileBase}${suffix}-${pngSize}.png`)}
          >
            Download PNG
          </button>
        </div>
      </section>

      {icon.rules.length > 0 && (
        <p className="rule-links">
          <span>Rules:</span>
          {icon.rules.map((r) => (r.href ? <a key={r.label} href={r.href}>{r.label}</a> : <span key={r.label}>{r.label}</span>))}
        </p>
      )}
    </Sheet>
  );
}
