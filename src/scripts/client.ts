// Browser helpers shared by the shell script and islands. Keep this file small: it is in every page's bundle.

export interface ToastDetail {
  message: string;
  /** Part of the message set in the mono face: the value or file name. */
  value?: string;
}

/** Shows a message in the page's toast region (role="status"). */
export function toast(message: string, value?: string): void {
  window.dispatchEvent(new CustomEvent<ToastDetail>("bh:toast", { detail: { message, value } }));
}

/** Copies text and announces what was copied. The message names the thing: "Comet Green #1E5B4A copied". */
export async function copyText(text: string, message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast(message, message.includes(text) ? text : undefined);
    return true;
  } catch {
    toast("Copy did not work in this browser. Select the value and copy it.");
    return false;
  }
}

/** Plays a one-shot CSS animation set by `className`, from the start even if it is already running. */
export function replay(el: Element, className: string): void {
  el.classList.remove(className);
  void el.getBoundingClientRect();
  el.classList.add(className);
  el.addEventListener("animationend", () => el.classList.remove(className), { once: true });
}

/** The copied row's success flash (DESIGN_SYSTEM.md, Motion). */
export const flash = (el: Element) => replay(el, "is-flashing");

/** A copy button's icon swaps to a check for a moment (DESIGN_SYSTEM.md, Motion). */
export function checked(btn: HTMLElement) {
  const svg = btn.querySelector("svg");
  if (!svg || btn.dataset.copied !== undefined) return;
  const icon = svg.innerHTML;
  btn.dataset.copied = "";
  svg.innerHTML = '<path d="m5 12 5 5 9-10"/>';
  window.setTimeout(() => {
    svg.innerHTML = icon;
    delete btn.dataset.copied;
  }, 1500);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
