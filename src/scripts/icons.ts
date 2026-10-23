// The detail island may hydrate after a click. It reads window.bhIconRequest when it mounts.
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLElement>("[data-icon-id]");
  if (!btn) return;
  const detail = { id: btn.dataset.iconId, opener: btn };
  (window as { bhIconRequest?: typeof detail }).bhIconRequest = detail;
  window.dispatchEvent(new CustomEvent("bh:icon-open", { detail }));
});
