// Browser helpers shared by the shell script and islands. Keep this file small: it is in every page's bundle.

/** Shows a message in the page's toast region (role="status"). */
export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent("bh:toast", { detail: message }));
}

/** Copies text and announces what was copied. The message must name the thing copied. */
export async function copyText(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
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
