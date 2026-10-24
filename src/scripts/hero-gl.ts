// Home hero gradient runner (DESIGN_SYSTEM.md, section 9), used by src/scripts/hero.ts.
// Draws the grain mesh with a WebGL2 fragment shader from the tuned tones in --hero-1 to --hero-3 (src/theme/
// hero-tint.ts), which already follow the theme. Pauses when the tab is hidden or the hero is offscreen, holds
// one still frame under reduced motion, and leaves the static CSS gradient in place without WebGL.

const VERTEX = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

// Shared helpers: hash, value noise, and a short fbm for the domain warp.
const NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}`;

// Three soft tones drifting on slow, unrelated periods (a full cycle well over a minute), warped by noise,
// faded out toward the text on the left and toward the bottom, with about 5% film grain.
const MESH = `#version 300 es
precision highp float;
uniform float t;
uniform vec2 res;
uniform vec3 bg, c1, c2, c3;
out vec4 color;
${NOISE}
float blob(vec2 p, vec2 at, float r) { float d = length(p - at) / r; return exp(-d * d); }
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float ar = res.x / res.y;
  vec2 p = uv * vec2(ar, 1.0);
  vec2 w = p + 0.2 * vec2(fbm(p * 1.3 + t * 0.05), fbm(p * 1.3 - t * 0.04));
  vec3 c = bg;
  c = mix(c, c1, 0.9 * blob(w, vec2(ar * 0.80 + 0.14 * sin(t * 0.083), 0.75 + 0.10 * cos(t * 0.097)), 0.5));
  c = mix(c, c2, 0.85 * blob(w, vec2(ar * 0.98 + 0.10 * cos(t * 0.071), 0.30 + 0.12 * sin(t * 0.061)), 0.45));
  c = mix(c, c3, 0.8 * blob(w, vec2(ar * 0.55 + 0.16 * sin(t * 0.053 + 1.0), 0.95 + 0.08 * cos(t * 0.089)), 0.45));
  c = mix(bg, c, smoothstep(0.3, 0.85, uv.x) * smoothstep(0.0, 0.45, uv.y));
  c += (hash(gl_FragCoord.xy + fract(t * 3.0)) - 0.5) * 0.05;
  color = vec4(c, 1.0);
}`;

export interface Tones {
  bg: [number, number, number];
  c1: [number, number, number];
  c2: [number, number, number];
  c3: [number, number, number];
  line: [number, number, number];
  text: [number, number, number];
}

/** "#c2dfd4" to [0.76, 0.87, 0.83]. Anything else reads as white. */
export function rgb(value: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function readTones(el: HTMLElement): Tones {
  const css = getComputedStyle(el);
  const v = (name: string) => rgb(css.getPropertyValue(name));
  return { bg: v("--bg"), c1: v("--hero-1"), c2: v("--hero-2"), c3: v("--hero-3"), line: v("--hero-line"), text: v("--text") };
}

export interface Preset {
  fragment: string;
  /** Called each frame with the program's uniforms set so far. */
  extra?: (gl: WebGL2RenderingContext, u: (name: string) => WebGLUniformLocation | null) => void;
}

/** Runs a fragment shader behind the hero. Returns false when WebGL2 is not available. */
export function start(hero: HTMLElement, preset: Preset): boolean {
  const canvas = document.createElement("canvas");
  canvas.className = "hero-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
  if (!gl) return false;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, preset.fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  // One triangle that covers the whole canvas.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(program, name);

  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let tones = readTones(hero);
  let visible = true;
  let frame = 0;
  const begin = performance.now();

  function draw(now: number) {
    frame = 0;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, w, h);
    // Under reduced motion the clock stops at one frame.
    gl!.uniform1f(u("t"), still.matches ? 20 : (now - begin) / 1000 + 20);
    gl!.uniform2f(u("res"), w, h);
    gl!.uniform3fv(u("bg"), tones.bg);
    gl!.uniform3fv(u("c1"), tones.c1);
    gl!.uniform3fv(u("c2"), tones.c2);
    gl!.uniform3fv(u("c3"), tones.c3);
    gl!.uniform3fv(u("line"), tones.line);
    gl!.uniform3fv(u("ink"), tones.text);
    preset.extra?.(gl!, u);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    hero.dataset.heroState = still.matches ? "still" : "moving";
    if (!still.matches) schedule();
  }

  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  /** Draws once now, for a change while paused or held still. */
  const redraw = () => requestAnimationFrame(draw);

  new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) schedule();
  }).observe(hero);
  document.addEventListener("visibilitychange", schedule);
  still.addEventListener("change", redraw);
  // The tones follow the theme toggle and the system setting.
  const retone = () => {
    tones = readTones(hero);
    redraw();
  };
  new MutationObserver(retone).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retone);
  addEventListener("resize", redraw, { passive: true });

  // A lost context (GPU reset, too many contexts) falls back to the static gradient underneath.
  canvas.addEventListener("webglcontextlost", () => {
    cancelAnimationFrame(frame);
    canvas.remove();
    hero.dataset.heroState = "static";
  });

  hero.prepend(canvas);
  requestAnimationFrame((now) => {
    draw(now);
    canvas.classList.add("is-ready");
  });
  (hero as HTMLElement & { heroRedraw?: () => void }).heroRedraw = redraw;
  return true;
}

export const mesh: Preset = { fragment: MESH };
export { NOISE };
