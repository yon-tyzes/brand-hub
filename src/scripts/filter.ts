// Filter pills and filter field inside [data-filter-root] (markup: src/site/ui.tsx Pills).
for (const root of document.querySelectorAll<HTMLElement>("[data-filter-root]")) {
  const pills = [...root.querySelectorAll<HTMLButtonElement>("[data-filter-pills] .pill")];
  const search = root.querySelector<HTMLInputElement>("input[data-filter-search]");
  const status = root.querySelector<HTMLElement>("[data-filter-status]");
  const items = [...root.querySelectorAll<HTMLElement>("[data-filter-item]")];
  const groups = [...root.querySelectorAll<HTMLElement>("[data-filter-group]")];
  const noun = status?.dataset.noun ?? "items";

  const apply = () => {
    const selected = pills.filter((p) => p.dataset.value !== "all" && p.getAttribute("aria-pressed") === "true").map((p) => p.dataset.value!);
    const query = search?.value.trim().toLowerCase() ?? "";
    let shown = 0;
    for (const item of items) {
      const values = (item.dataset.values ?? "").split(" ");
      const ok = (!selected.length || selected.some((v) => values.includes(v))) && (!query || (item.dataset.text ?? "").includes(query));
      item.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector("[data-filter-item]:not([hidden])");
    if (status) status.textContent = `${shown} ${shown === 1 ? noun.replace(/s$/, "") : noun} shown`;
  };

  root.addEventListener("click", (e) => {
    const pill = (e.target as Element).closest<HTMLButtonElement>("[data-filter-pills] .pill");
    if (!pill) return;
    const all = pills.find((p) => p.dataset.value === "all");
    if (pill === all) {
      for (const p of pills) p.setAttribute("aria-pressed", String(p === all));
    } else {
      pill.setAttribute("aria-pressed", String(pill.getAttribute("aria-pressed") !== "true"));
      const any = pills.some((p) => p !== all && p.getAttribute("aria-pressed") === "true");
      all?.setAttribute("aria-pressed", String(!any));
    }
    apply();
  });
  search?.addEventListener("input", apply);
}
