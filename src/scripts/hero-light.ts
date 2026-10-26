// The pointer light in the home search field (DESIGN_SYSTEM.md, section 8): a soft highlight that follows a fine
// pointer. Sets --light-x and --light-y once per animation frame; the stylesheet draws it and fades it in and out.
// Touch, reduced motion, and reduced transparency get none.
const field = document.querySelector<HTMLElement>(".hero-search");
const fine = matchMedia("(hover: hover) and (pointer: fine)");
const off = matchMedia("(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce)");

if (field) {
  let frame = 0;
  let x = 0;
  let y = 0;
  field.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || !fine.matches || off.matches) return;
    const r = field.getBoundingClientRect();
    x = e.clientX - r.left;
    y = e.clientY - r.top;
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      field.style.setProperty("--light-x", `${x}px`);
      field.style.setProperty("--light-y", `${y}px`);
      field.dataset.lit = "";
    });
  });
  field.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    delete field.dataset.lit;
  });
}

export {};
