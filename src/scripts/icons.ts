// Icons page: pick an icon and a color pair, filter by name, and download the selected icon as SVG or PNG in
// the pair's icon color, on a transparent background. Markup: src/site/pages/library/IconsPage.tsx. A #icon-id
// in the address selects that icon. Each theme opens on its own default pair; a pair the viewer picks is kept
// for later visits.
import { downloadBlob } from "./client.ts";
import { flip } from "./flip.ts";
import { still } from "./motion.ts";

const PAIR_KEY = "bh-icon-pair";
/** The recolor wave: each tile 20ms after the one before, all done within 400ms of a fast (120ms) change. */
const WAVE_STEP = 20;
const WAVE_LAST = 400 - 120;

function savedPair(): string | null {
  try {
    return localStorage.getItem(PAIR_KEY);
  } catch {
    return null;
  }
}

function savePair(id: string) {
  try {
    localStorage.setItem(PAIR_KEY, id);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

const root = document.querySelector<HTMLElement>("[data-icons-root]");
if (root) {
  const tiles = [...root.querySelectorAll<HTMLButtonElement>("[data-icon-id]")];
  const radios = [...root.querySelectorAll<HTMLButtonElement>("[data-pair]")];
  const filter = root.querySelector<HTMLInputElement>("[data-icon-filter]");
  const count = root.querySelector<HTMLElement>("[data-icon-count]");
  const preview = root.querySelector<HTMLElement>("[data-icon-preview]");
  const thumb = root.querySelector<HTMLElement>("[data-icon-thumb]");
  const nameOut = root.querySelector<HTMLElement>("[data-icon-name-out]");
  const metaOut = root.querySelector<HTMLElement>("[data-icon-meta]");
  const board = root.querySelector<HTMLElement>("[data-icon-board]");
  const clear = root.querySelector<HTMLButtonElement>("[data-icon-clear]");
  const empty = root.querySelector<HTMLElement>("[data-icon-empty]");
  let tile = tiles.find((t) => t.getAttribute("aria-pressed") === "true") ?? tiles[0];
  let color = radios.find((r) => r.getAttribute("aria-checked") === "true") ?? radios[0];
  let picked = radios.find((r) => r.dataset.pair === savedPair());

  const html = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => (html.dataset.theme ? html.dataset.theme === "dark" : systemDark.matches);
  /** The viewer's pick, else the current theme's default pair. */
  const current = () => picked ?? radios.find((r) => r.dataset.pair === (isDark() ? root.dataset.pairDark : root.dataset.pairLight)) ?? radios[0];

  const svgOf = (t: HTMLElement, size: number, hex: string) =>
    (t.querySelector("svg")?.outerHTML ?? "")
      .replace(/currentColor/g, hex)
      .replace(/\swidth="[^"]*"/, ` width="${size}"`)
      .replace(/\sheight="[^"]*"/, ` height="${size}"`)
      .replace(/\saria-hidden="true"/, "");

  function show() {
    if (!tile) return;
    for (const t of tiles) t.setAttribute("aria-pressed", String(t === tile));
    const markup = tile.querySelector("svg")?.outerHTML ?? "";
    if (preview) preview.innerHTML = markup.replace(/\swidth="[^"]*"/, ' width="64"').replace(/\sheight="[^"]*"/, ' height="64"');
    if (thumb) thumb.innerHTML = markup;
    if (nameOut) nameOut.textContent = tile.dataset.iconName ?? "";
    for (const n of root!.querySelectorAll("[data-icon-name-hidden]")) n.textContent = tile.dataset.iconName ?? "";
    if (metaOut) metaOut.textContent = [tile.dataset.iconGroupName, color?.dataset.colorName].filter(Boolean).join(" · ");
  }

  function pickColor(r: HTMLButtonElement | undefined, { focus = false, save = false } = {}) {
    if (!r) return;
    color = r;
    if (save) {
      picked = r;
      savePair(r.dataset.pair!);
    }
    for (const x of radios) {
      x.setAttribute("aria-checked", String(x === r));
      x.tabIndex = x === r ? 0 : -1;
    }
    // Stagger the shown tiles in reading order; hidden (filtered) tiles change at once.
    let n = 0;
    // Reduced or calm motion: every tile recolors at once.
    for (const t of tiles) t.style.setProperty("--wave", `${t.closest("[hidden]") || still.matches ? 0 : Math.min(n++ * WAVE_STEP, WAVE_LAST)}ms`);
    root!.style.setProperty("--icon-color", r.dataset.iconColor!);
    root!.style.setProperty("--icon-ground", r.dataset.ground!);
    root!.style.setProperty("--icon-text", r.dataset.labelColor!);
    if (focus) r.focus();
    show();
  }

  // Without a pick, the pair follows the theme toggle and the system setting.
  const follow = () => !picked && pickColor(current());
  new MutationObserver(follow).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
  systemDark.addEventListener("change", follow);
  pickColor(current());

  root.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLButtonElement>("[data-icon-id]");
    if (t) {
      tile = t;
      history.replaceState(null, "", `#${t.dataset.iconId}`);
      return show();
    }
    const r = (e.target as Element).closest<HTMLButtonElement>("[data-pair]");
    if (r) pickColor(r, { save: true });
  });

  // Radio group keys: arrows move the choice.
  root.querySelector("[role=radiogroup]")?.addEventListener("keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    const step = k === "ArrowRight" || k === "ArrowDown" ? 1 : k === "ArrowLeft" || k === "ArrowUp" ? -1 : 0;
    if (!step || !color) return;
    e.preventDefault();
    pickColor(radios[(radios.indexOf(color) + step + radios.length) % radios.length]!, { focus: true, save: true });
  });

  // A query shows one flat grid of matches across all groups (the board's data-searching); an empty query, the
  // clear button, or Escape brings the groups back. Every word of the query must appear in the icon's text.
  function search() {
    if (!filter) return;
    const q = filter.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    let shown = 0;
    const items = [...root!.querySelectorAll<HTMLElement>("[data-icon-item]")];
    flip(items, () => {
      for (const item of items) {
        const text = item.dataset.text ?? "";
        item.hidden = !words.every((w) => text.includes(w));
        if (!item.hidden) shown++;
      }
      for (const g of root!.querySelectorAll<HTMLElement>("section[data-icon-group]")) g.hidden = !g.querySelector("[data-icon-item]:not([hidden])");
      board?.toggleAttribute("data-searching", !!q);
    });
    const quoted = `"${filter.value.trim()}"`;
    if (clear) clear.hidden = !q;
    if (empty) {
      empty.hidden = !q || shown > 0;
      empty.textContent = `No icons match ${quoted}.`;
    }
    if (count) count.textContent = !q ? `${shown} of ${count.dataset.total} icons` : `${shown} ${shown === 1 ? "icon matches" : "icons match"} ${quoted}`;
  }

  function reset() {
    if (!filter) return;
    filter.value = "";
    search();
    filter.focus();
  }

  filter?.addEventListener("input", search);
  filter?.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !filter.value) return;
    e.preventDefault();
    reset();
  });
  clear?.addEventListener("click", reset);

  async function png(svg: string, size: number): Promise<Blob> {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
    canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"));
  }

  root.addEventListener("click", async (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("[data-icon-download]");
    if (!b || !tile) return;
    const hex = color?.dataset.iconColor ?? "#000000";
    const base = `${tile.dataset.iconFile}${color ? `-${color.dataset.colorId}` : ""}`;
    if (b.dataset.iconDownload === "svg") downloadBlob(new Blob([svgOf(tile, 24, hex)], { type: "image/svg+xml" }), `${base}.svg`);
    else downloadBlob(await png(svgOf(tile, 256, hex), 256), `${base}-256.png`);
  });

  const fromHash = () => {
    const t = tiles.find((x) => x.dataset.iconId === decodeURIComponent(location.hash.slice(1)));
    if (t) {
      tile = t;
      show();
    }
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}
