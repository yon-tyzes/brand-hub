// The theme's thumbnail, drawn from its own palette: the light background, a dark band, a line in the text color,
// and the six accents in order. Every row uses PNG filter 0, so the bytes depend only on the colors.
import { zlibSync } from "fflate";
import { hexToRgb } from "../theme/color.ts";

const W = 256;
const H = 192;

interface Rect { x: number; y: number; w: number; h: number; hex: string }

function layout(c: Record<string, string>): Rect[] {
  const rects: Rect[] = [
    { x: 0, y: 0, w: W, h: H, hex: c.lt1! },
    { x: 0, y: 0, w: W, h: 56, hex: c.dk2! },
    { x: 16, y: 76, w: 160, h: 10, hex: c.dk1! },
    { x: 16, y: 96, w: 112, h: 10, hex: c.lt2! },
  ];
  const gap = 4;
  const bar = (W - 32 - 5 * gap) / 6;
  for (let i = 0; i < 6; i++) rects.push({ x: 16 + i * (bar + gap), y: 136, w: bar, h: 40, hex: c[`accent${i + 1}`]! });
  return rects;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** A W by H RGB PNG of the palette. */
export function palettePng(colors: Record<string, string>): Uint8Array {
  const stride = W * 3 + 1;
  const raw = new Uint8Array(stride * H);
  for (const r of layout(colors)) {
    const [red, green, blue] = hexToRgb(r.hex);
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = Math.round(r.x); x < Math.round(r.x + r.w); x++) {
        const at = y * stride + 1 + x * 3;
        raw[at] = red;
        raw[at + 1] = green;
        raw[at + 2] = blue;
      }
    }
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, W);
  view.setUint32(4, H);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlibSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
}
