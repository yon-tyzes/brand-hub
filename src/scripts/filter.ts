// Filter chips inside [data-filter-root]: one choice at a time, "all" shows everything. Items carry their
// values in data-values and move to their new place (src/scripts/flip.ts). Markup: src/site/pages/library/TemplatesPage.tsx.
import { flip } from "./flip.ts";

for (const root of document.querySelectorAll<HTMLElement>("[data-filter-root]")) {
  const chips = [...root.querySelectorAll<HTMLButtonElement>("[data-filter-value]")];
  const items = [...root.querySelectorAll<HTMLElement>("[data-filter-item]")];
  const status = root.querySelector<HTMLElement>("[data-filter-status]");
  root.addEventListener("click", (e) => {
    const chip = (e.target as Element).closest<HTMLButtonElement>("[data-filter-value]");
    if (!chip) return;
    const value = chip.dataset.filterValue!;
    for (const c of chips) c.setAttribute("aria-pressed", String(c === chip));
    let shown = 0;
    flip(items, () => {
      for (const item of items) {
        item.hidden = value !== "all" && !(item.dataset.values ?? "").split(" ").includes(value);
        if (!item.hidden) shown++;
      }
    });
    if (status) status.textContent = `${shown} ${shown === 1 ? (status.dataset.noun ?? "items").replace(/s$/, "") : status.dataset.noun} shown`;
  });
}
