// Filter reflow (DESIGN_SYSTEM.md, Motion): items glide from where they were to where they land instead of
// jumping, and items that appear fade in. Runs `change` with no motion under reduced motion.

const DURATION = 320; // --duration-slow
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // --ease-in-out

export function flip(items: HTMLElement[], change: () => void): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return change();
  const before = new Map(items.filter((el) => !el.hidden).map((el) => [el, el.getBoundingClientRect()]));
  change();
  for (const el of items) {
    if (el.hidden) continue;
    const from = before.get(el);
    if (!from) {
      el.animate([{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "none" }], { duration: DURATION, easing: EASE });
      continue;
    }
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: DURATION, easing: EASE });
  }
}
