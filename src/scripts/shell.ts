// Site shell behavior, loaded on every page: theme switch, module menu, mobile menu, toasts, copy buttons,
// and the search shortcut. The search dialog and its index load on first use.
import { copyText } from "./client.ts";

const THEME_KEY = "bh-theme";

// ---------- Theme ----------
const themeSwitches = [...document.querySelectorAll<HTMLButtonElement>("[data-theme-switch]")];
function setTheme(dark: boolean) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  for (const s of themeSwitches) s.setAttribute("aria-checked", String(dark));
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}
for (const s of themeSwitches) {
  s.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "dark"));
  s.addEventListener("click", () => setTheme(s.getAttribute("aria-checked") !== "true"));
}

// ---------- Disclosure menus (module menu, mobile menu) ----------
function disclosure(trigger: HTMLButtonElement, opts: { lockScroll?: boolean } = {}) {
  const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
  if (!panel) return;
  const container = trigger.closest<HTMLElement>("[data-menu-root]") ?? panel.parentElement!;
  const isOpen = () => trigger.getAttribute("aria-expanded") === "true";
  const items = () => [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];

  function set(open: boolean, returnFocus = false) {
    trigger.setAttribute("aria-expanded", String(open));
    panel!.hidden = !open;
    if (opts.lockScroll) document.documentElement.classList.toggle("no-scroll", open);
    if (!open && returnFocus) trigger.focus();
  }

  trigger.addEventListener("click", () => set(!isOpen()));
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && !opts.lockScroll) {
      e.preventDefault();
      set(true);
      items()[0]?.focus();
    }
  });
  panel.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") return set(false, true);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (next === undefined || i < 0) return;
    e.preventDefault();
    list[(next + list.length) % list.length]?.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen() && container.contains(document.activeElement)) set(false, true);
  });
  document.addEventListener("click", (e) => {
    if (isOpen() && !container.contains(e.target as Node)) set(false);
  });
  container.addEventListener("focusout", (e) => {
    if (isOpen() && e.relatedTarget && !container.contains(e.relatedTarget as Node)) set(false);
  });
  panel.addEventListener("click", (e) => {
    if ((e.target as Element).closest("a[href]")) set(false);
  });
  // Leaving the breakpoint where the menu exists closes it.
  window.matchMedia("(min-width: 992px)").addEventListener("change", () => set(false));
}

for (const t of document.querySelectorAll<HTMLButtonElement>("[data-menu-trigger]")) disclosure(t);
for (const t of document.querySelectorAll<HTMLButtonElement>("[data-mobile-menu-trigger]")) disclosure(t, { lockScroll: true });

// ---------- Toasts ----------
const region = document.querySelector<HTMLElement>("[data-toast-region]");
let hideTimer: number | undefined;
function showToast(message: string) {
  if (!region) return;
  window.clearTimeout(hideTimer);
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
  el.append(document.createTextNode(message));
  region.replaceChildren(el);
  const schedule = () => (hideTimer = window.setTimeout(() => el.remove(), 4000));
  el.addEventListener("mouseenter", () => window.clearTimeout(hideTimer));
  el.addEventListener("mouseleave", schedule);
  schedule();
}
window.addEventListener("bh:toast", (e) => showToast((e as CustomEvent<string>).detail));

// ---------- Copy buttons ----------
document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest<HTMLElement>("[data-copy]");
  if (btn) copyText(btn.dataset.copy ?? "", btn.dataset.copyMessage ?? `${btn.dataset.copy ?? ""} copied.`);
});

// ---------- Search ----------
let searchModule: Promise<typeof import("../islands/search/mount.tsx")> | undefined;
let searchReady = false;
function openSearch(opener?: HTMLElement | null) {
  // Until the dialog exists, keep what the person types and hand it over as the starting query.
  let typed = "";
  const buffer = (e: KeyboardEvent) => {
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    typed += e.key;
  };
  if (!searchReady) document.addEventListener("keydown", buffer, true);
  searchModule ??= import("../islands/search/mount.tsx");
  searchModule.then((m) => {
    document.removeEventListener("keydown", buffer, true);
    m.openSearch(opener ?? null, typed);
    searchReady = true;
  });
}
for (const b of document.querySelectorAll<HTMLElement>("[data-search-open]")) b.addEventListener("click", () => openSearch(b));

const shortcuts = (document.documentElement.dataset.searchShortcuts ?? "").split(" ").filter(Boolean);
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  for (const s of shortcuts) {
    const parts = s.toLowerCase().split("+");
    const key = parts.pop();
    const mod = parts.includes("mod");
    if (e.key.toLowerCase() !== key) continue;
    if (mod ? !(e.metaKey || e.ctrlKey) : e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) continue;
    e.preventDefault();
    openSearch(document.activeElement as HTMLElement);
    return;
  }
});
