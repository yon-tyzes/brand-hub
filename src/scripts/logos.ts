// Light and dark preview toggle on logo cards.
for (const group of document.querySelectorAll<HTMLElement>("[data-bg-toggle]")) {
  const preview = group.closest(".card")?.querySelector<HTMLElement>("[data-logo-preview]");
  group.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("button[data-bg]");
    if (!btn || !preview) return;
    preview.dataset.bg = btn.dataset.bg;
    for (const b of group.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b === btn));
  });
}
