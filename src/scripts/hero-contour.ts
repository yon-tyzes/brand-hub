// The contour preset for the home hero (DESIGN_SYSTEM.md, section 9): hairline contours in the text color at low
// strength, every fifth line in the brand's color, bending slightly around the pointer. Uses the same loader,
// pausing, and fallbacks as the mesh (src/scripts/hero-gl.ts).
import { NOISE, type Preset } from "./hero-gl.ts";

const CONTOUR = `#version 300 es
precision highp float;
uniform float t;
uniform vec2 res;
uniform vec3 bg, ink, line;
uniform vec3 ptr;
out vec4 color;
${NOISE}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  float ar = res.x / res.y;
  vec2 p = uv * vec2(ar, 1.0);
  float f = fbm(p * 1.6 + vec2(t * 0.02, -t * 0.015));
  vec2 d = (uv - ptr.xy) * vec2(ar, 1.0);
  f += 0.06 * ptr.z * exp(-dot(d, d) / 0.04);
  float n = f * 18.0;
  float k = fract(n);
  float stroke = 1.0 - smoothstep(0.0, fwidth(n) * 1.2, min(k, 1.0 - k));
  bool major = mod(floor(n + 0.5), 5.0) < 0.5;
  vec3 c = major ? line : ink;
  float strength = major ? 0.55 : 0.12;
  float mask = smoothstep(0.3, 0.85, uv.x) * smoothstep(0.0, 0.45, uv.y);
  vec3 outc = mix(bg, c, stroke * strength * mask);
  outc += (hash(gl_FragCoord.xy + fract(t * 3.0)) - 0.5) * 0.03;
  color = vec4(outc, 1.0);
}`;

/** The pointer bends the lines around it, easing in and out. Ignored under reduced motion. */
export function contour(hero: HTMLElement): Preset {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const target = { x: 0.8, y: 0.6, on: 0 };
  const now = { ...target };
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1 - (e.clientY - r.top) / r.height;
    target.on = 1;
  });
  hero.addEventListener("pointerleave", () => (target.on = 0));
  return {
    fragment: CONTOUR,
    extra(gl, u) {
      if (still.matches) now.on = 0;
      else {
        now.x += (target.x - now.x) * 0.08;
        now.y += (target.y - now.y) * 0.08;
        now.on += (target.on - now.on) * 0.05;
      }
      gl.uniform3f(u("ptr"), now.x, now.y, now.on);
    },
  };
}
