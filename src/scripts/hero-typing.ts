// The home search hint types out real asset names from the brand's data, one after another (Hero component).
// The text is drawn in an overlay hidden from assistive tech, so the field keeps one stable label. It holds the
// first hint under reduced motion, and stops while the field has focus or text.

const field = document.querySelector<HTMLInputElement>("[data-hero-search]");
const hints: string[] = JSON.parse(field?.dataset.hints ?? "[]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

if (field && hints.length > 1 && !still.matches) type(field);

export function type(input: HTMLInputElement) {
  const overlay = Object.assign(document.createElement("span"), { className: "hero-hint" });
  overlay.setAttribute("aria-hidden", "true");
  input.after(overlay);
  const fallback = input.placeholder;
  input.placeholder = "";
  input.parentElement?.classList.add("is-typing");

  const PREFIX = 'Try "';
  let word = 0;
  let shown = 0;
  let deleting = false;
  let timer = 0;

  const text = () => `${PREFIX}${hints[word]}"`;
  const quiet = () => document.activeElement === input || input.value !== "" || document.hidden;

  function tick() {
    if (quiet()) {
      overlay.hidden = input.value !== "" || document.activeElement === input;
      timer = window.setTimeout(tick, 400);
      return;
    }
    overlay.hidden = false;
    const full = text();
    if (!deleting) {
      shown++;
      if (shown >= full.length) {
        deleting = true;
        timer = window.setTimeout(tick, 1400);
        overlay.textContent = full;
        return;
      }
    } else {
      shown--;
      if (shown <= PREFIX.length) {
        deleting = false;
        word = (word + 1) % hints.length;
      }
    }
    overlay.textContent = text().slice(0, shown);
    timer = window.setTimeout(tick, deleting ? 28 : 55);
  }

  // A focused field shows the plain hint, so people see what they can type.
  input.addEventListener("focus", () => (input.placeholder = fallback));
  input.addEventListener("blur", () => (input.placeholder = ""));
  shown = text().length;
  overlay.textContent = text();
  deleting = true;
  timer = window.setTimeout(tick, 1400);
  still.addEventListener("change", () => {
    window.clearTimeout(timer);
    overlay.textContent = `${PREFIX}${hints[0]}"`;
  });
}
