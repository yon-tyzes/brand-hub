// ARIA tabs behavior for [data-tabs] (markup: src/site/ui.tsx Tabs). Arrows move and select; Home and End jump.
function select(list: HTMLElement, tab: HTMLElement, focus: boolean) {
  for (const t of list.querySelectorAll<HTMLElement>('[role="tab"]')) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute("aria-controls") ?? "");
    if (panel) panel.hidden = !on;
  }
  if (focus) tab.focus();
}

for (const list of document.querySelectorAll<HTMLElement>("[data-tabs] > [role=tablist]")) {
  const tabs = () => [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
  list.addEventListener("click", (e) => {
    const tab = (e.target as Element).closest<HTMLElement>('[role="tab"]');
    if (tab) select(list, tab, false);
  });
  list.addEventListener("keydown", (e) => {
    const all = tabs();
    const i = all.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(list, all[(next + all.length) % all.length]!, true);
  });
}
