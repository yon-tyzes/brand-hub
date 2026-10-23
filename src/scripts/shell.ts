// Site shell behavior, loaded on every page: theme toggle, frosted top bar, toasts, copy buttons, and the
// search shortcut. The search dialog and its index load on first use.
import { copyText } from "./client.ts";

const THEME_KEY = "bh-theme";

// ---------- Theme ----------
const root = document.documentElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
// No stored choice: the system setting decides (the stylesheet follows prefers-color-scheme).
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches);
const toggles = [...document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")];
function label() {
  for (const t of toggles) t.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
}
function setTheme(dark: boolean) {
  root.dataset.theme = dark ? "dark" : "light";
  label();
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}
for (const t of toggles) t.addEventListener("click", () => setTheme(!isDark()));
systemDark.addEventListener("change", label);
label();

// ---------- Top bar: frosted once the page scrolls under it ----------
const bar = document.querySelector<HTMLElement>("[data-topbar]");
if (bar) {
  const update = () => bar.toggleAttribute("data-scrolled", window.scrollY > 0);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

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
function openSearch(opener?: HTMLElement | null, initial = "") {
  // Until the dialog exists, keep what the person types and hand it over as the starting query.
  let typed = initial;
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

// The home hero's field: what someone types there carries on in the search dialog.
const heroSearch = document.querySelector<HTMLInputElement>("[data-hero-search]");
heroSearch?.addEventListener("input", () => {
  const typed = heroSearch.value;
  heroSearch.value = "";
  if (typed) openSearch(heroSearch, typed);
});

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
