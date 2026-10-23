// Color math: hex parsing, OKLab mixing (matches CSS `color-mix(in oklab, ...)`), OKLCH conversion for the
// hero tuning, and WCAG 2.x relative luminance and contrast ratio.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToOklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export type Oklch = { l: number; c: number; h: number };

export function hexToOklch(hex: string): Oklch {
  const [l, a, b] = rgbToOklab(hexToRgb(hex));
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: (h + 360) % 360 };
}

const oklchToRgb = ({ l, c, h }: Oklch): Rgb => {
  const rad = (h * Math.PI) / 180;
  return oklabToRgb([l, c * Math.cos(rad), c * Math.sin(rad)]);
};

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5);

/** OKLCH to hex. Out-of-gamut colors keep lightness and hue and lose chroma until they fit. */
export function oklchToHex(color: Oklch): string {
  let rgb = oklchToRgb(color);
  if (!inGamut(rgb)) {
    let [lo, hi] = [0, color.c];
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgb({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToRgb({ ...color, c: lo });
  }
  return rgbToHex(rgb);
}

/** Mix `b` into `a` by `amount` (0 to 1) in OKLab. Same result as `color-mix(in oklab, a, b amount%)`. */
export function mix(a: string, b: string, amount: number): string {
  const x = rgbToOklab(hexToRgb(a));
  const y = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * amount) as Rgb));
}

/** `rgb(r g b / alpha)` string for translucent tokens (scrim, shadows). */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. Not rounded: 4.49 fails a 4.5 minimum. */
export function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
