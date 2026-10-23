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
export async function copyText(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(message, message.includes(text) ? text : undefined);
  } catch {
    toast("Copy did not work in this browser. Select the value and copy it.");
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
