// The one "still" condition (ENGINE_SPEC.md, section 6, Calm motion): the viewer's reduced-motion setting, or
// motion: "calm" in hub.config.ts, which Layout.astro writes as data-motion="calm" on the root. Every decorative
// motion reads it. Shaped like a MediaQueryList, so scripts use it where they used matchMedia before.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

export const calm = () => document.documentElement.dataset.motion === "calm";

export const still = {
  get matches() {
    return calm() || reduced.matches;
  },
  /** Calm never changes on a page, so only the viewer's setting can fire. */
  addEventListener: (type: "change", listener: () => void) => reduced.addEventListener(type, listener),
};
