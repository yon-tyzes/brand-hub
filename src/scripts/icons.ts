// Icons page: pick an icon and a color, filter by name, and download the selected icon as SVG or PNG in
// that color. Markup: src/site/pages/library/IconsPage.tsx. A #icon-id in the address selects that icon.
import { downloadBlob } from "./client.ts";

const root = document.querySelector<HTMLElement>("[data-icons-root]");
if (root) {
  const tiles = [...root.querySelectorAll<HTMLButtonElement>("[data-icon-id]")];
  const radios = [...root.querySelectorAll<HTMLButtonElement>("[data-icon-color]")];
  const filter = root.querySelector<HTMLInputElement>("[data-icon-filter]");
  const count = root.querySelector<HTMLElement>("[data-icon-count]");
  const preview = root.querySelector<HTMLElement>("[data-icon-preview]");
  const thumb = root.querySelector<HTMLElement>("[data-icon-thumb]");
  const nameOut = root.querySelector<HTMLElement>("[data-icon-name-out]");
  const metaOut = root.querySelector<HTMLElement>("[data-icon-meta]");
  let tile = tiles.find((t) => t.getAttribute("aria-pressed") === "true") ?? tiles[0];
  let color = radios.find((r) => r.getAttribute("aria-checked") === "true") ?? radios[0];

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
    if (metaOut) metaOut.textContent = [tile.dataset.iconGroup, color?.dataset.colorName].filter(Boolean).join(" · ");
  }

  function pickColor(r: HTMLButtonElement, focus = false) {
    color = r;
    for (const x of radios) {
      x.setAttribute("aria-checked", String(x === r));
      x.tabIndex = x === r ? 0 : -1;
    }
    root!.style.setProperty("--icon-color", r.dataset.iconColor!);
    if (focus) r.focus();
    show();
  }

  root.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLButtonElement>("[data-icon-id]");
    if (t) {
      tile = t;
      history.replaceState(null, "", `#${t.dataset.iconId}`);
      return show();
    }
    const r = (e.target as Element).closest<HTMLButtonElement>("[data-icon-color]");
    if (r) pickColor(r);
  });

  // Radio group keys: arrows move the choice.
  root.querySelector("[role=radiogroup]")?.addEventListener("keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    const step = k === "ArrowRight" || k === "ArrowDown" ? 1 : k === "ArrowLeft" || k === "ArrowUp" ? -1 : 0;
    if (!step || !color) return;
    e.preventDefault();
    pickColor(radios[(radios.indexOf(color) + step + radios.length) % radios.length]!, true);
  });

  filter?.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    for (const item of root.querySelectorAll<HTMLElement>("[data-icon-item]")) {
      const ok = !q || (item.dataset.text ?? "").includes(q);
      item.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of root.querySelectorAll<HTMLElement>("[data-icon-group]")) g.hidden = !g.querySelector("[data-icon-item]:not([hidden])");
    if (count) count.textContent = `${shown} of ${count.dataset.total} icons`;
  });

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
